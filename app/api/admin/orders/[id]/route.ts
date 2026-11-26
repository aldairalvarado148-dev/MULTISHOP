import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";

export const dynamic = "force-dynamic";

type ItemUpdate = { id: string; delivery_data?: string | null };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "La tienda aún no está configurada en Supabase." }, { status: 503 });
  }

  const { id } = await params;
  const admin = await createSupabaseAdminClient();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    payment_status?: string;
    admin_notes?: string;
    action?: "approve_payment" | "reject_payment" | "deliver";
    items?: ItemUpdate[];
  };

  const patch: Record<string, unknown> = {};
  const orderStatuses = ["pendiente", "pagado", "en_proceso", "entregado", "cancelado", "rechazado"];
  const paymentStatuses = ["pendiente", "en_revision", "aprobado", "rechazado", "reembolsado"];

  if (body.status && orderStatuses.includes(body.status)) {
    patch.status = body.status;
    if (body.status === "entregado") patch.delivered_at = new Date().toISOString();
  }
  if (body.payment_status && paymentStatuses.includes(body.payment_status)) {
    patch.payment_status = body.payment_status;
    if (body.payment_status === "aprobado" && !order.paid_at) {
      patch.paid_at = new Date().toISOString();
    }
  }
  if (typeof body.admin_notes === "string") {
    patch.admin_notes = body.admin_notes.slice(0, 2000) || null;
  }

  if (body.action === "approve_payment") {
    patch.payment_status = "aprobado";
    patch.status = order.status === "pendiente" ? "pagado" : order.status;
    patch.paid_at = order.paid_at ?? new Date().toISOString();
    await admin
      .from("payments")
      .update({
        status: "aprobado",
        reviewed_by: session.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("order_id", id);
  }

  if (body.action === "reject_payment") {
    patch.payment_status = "rechazado";
    patch.status = "rechazado";
    await admin
      .from("payments")
      .update({
        status: "rechazado",
        reviewed_by: session.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: body.admin_notes?.slice(0, 500) ?? null,
      })
      .eq("order_id", id);
  }

  if (body.action === "deliver") {
    patch.status = "entregado";
    patch.delivered_at = new Date().toISOString();
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("orders").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(body.items) && body.items.length > 0) {
    for (const item of body.items) {
      if (!item.id) continue;
      const itemPatch: Record<string, unknown> = {};
      if (item.delivery_data !== undefined) {
        itemPatch.delivery_data = item.delivery_data?.slice(0, 2000) || null;
        if (itemPatch.delivery_data) itemPatch.delivered_at = new Date().toISOString();
      }
      if (Object.keys(itemPatch).length > 0) {
        await admin.from("order_items").update(itemPatch).eq("id", item.id).eq("order_id", id);
      }
    }
  }

  if (order.user_id && (patch.status || patch.payment_status)) {
    const label =
      patch.status === "entregado"
        ? "Tu pedido fue entregado"
        : patch.payment_status === "aprobado"
          ? "Pago verificado"
          : patch.status === "en_proceso"
            ? "Pedido en proceso"
            : patch.status === "cancelado"
              ? "Pedido cancelado"
              : null;

    if (label) {
      await admin.from("notifications").insert({
        user_id: order.user_id,
        title: label,
        body: `Pedido ${order.order_number}`,
        type: "pedido",
        link: `/compras/${order.id}`,
      });
    }
  }

  await admin.from("admin_logs").insert({
    admin_id: session.userId,
    admin_email: session.email,
    action: body.action ?? "actualizar",
    entity: "orders",
    entity_id: id,
    details: { ...patch, items: body.items?.length ?? 0 },
  });

  return NextResponse.json({ ok: true });
}
