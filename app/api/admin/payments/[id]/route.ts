import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "La tienda aún no está configurada en Supabase." }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    kind?: "payment" | "topup";
    action?: "aprobar" | "rechazar";
    notes?: string;
  };

  const kind = body.kind ?? "payment";
  const action = body.action;
  if (action !== "aprobar" && action !== "rechazar") {
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  }

  const admin = await createSupabaseAdminClient();
  const now = new Date().toISOString();
  const notes = (body.notes ?? "").slice(0, 500) || null;

  if (kind === "topup") {
    const { data: topup } = await admin.from("wallet_topups").select("*").eq("id", id).maybeSingle();
    if (!topup) return NextResponse.json({ error: "Recarga no encontrada." }, { status: 404 });
    if (topup.status === "aprobado") {
      return NextResponse.json({ error: "Esta recarga ya fue aprobada." }, { status: 409 });
    }

    const { error } = await admin
      .from("wallet_topups")
      .update({
        status: action === "aprobar" ? "aprobado" : "rechazado",
        reviewed_by: session.userId,
        reviewed_at: now,
        review_notes: notes,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (action === "aprobar") {
      const { data: profile } = await admin
        .from("profiles")
        .select("balance")
        .eq("id", topup.user_id)
        .maybeSingle();
      const current = Number(profile?.balance ?? 0);
      const amount = Number(topup.amount);
      const next = Math.round((current + amount) * 100) / 100;

      await admin.from("profiles").update({ balance: next }).eq("id", topup.user_id);
      await admin.from("wallet_transactions").insert({
        user_id: topup.user_id,
        type: "credito",
        amount,
        balance_after: next,
        description: "Recarga aprobada por administración",
        admin_id: session.userId,
      });
      await admin.from("notifications").insert({
        user_id: topup.user_id,
        title: "Saldo acreditado",
        body: `Se acreditaron ${amount.toFixed(2)} en tu saldo.`,
        type: "saldo",
        link: "/saldo",
      });
    } else {
      await admin.from("notifications").insert({
        user_id: topup.user_id,
        title: "Recarga rechazada",
        body: notes ?? "Verifica los datos del pago e inténtalo de nuevo.",
        type: "saldo",
        link: "/saldo",
      });
    }

    await admin.from("admin_logs").insert({
      admin_id: session.userId,
      admin_email: session.email,
      action: `recarga_${action}`,
      entity: "wallet_topups",
      entity_id: id,
      details: { amount: Number(topup.amount) },
    });

    return NextResponse.json({ ok: true });
  }

  const { data: payment } = await admin.from("payments").select("*").eq("id", id).maybeSingle();
  if (!payment) return NextResponse.json({ error: "Pago no encontrado." }, { status: 404 });

  const { error } = await admin
    .from("payments")
    .update({
      status: action === "aprobar" ? "aprobado" : "rechazado",
      reviewed_by: session.userId,
      reviewed_at: now,
      review_notes: notes,
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orderPatch =
    action === "aprobar"
      ? { payment_status: "aprobado", status: "pagado", paid_at: payment.paid_at ?? now }
      : { payment_status: "rechazado", status: "rechazado" };

  await admin.from("orders").update(orderPatch).eq("id", payment.order_id);

  if (payment.user_id) {
    await admin.from("notifications").insert({
      user_id: payment.user_id,
      title: action === "aprobar" ? "Pago verificado" : "Pago rechazado",
      body:
        action === "aprobar"
          ? "Tu pago fue verificado. Prepararemos tu pedido."
          : notes ?? "No pudimos verificar el pago. Revisa el comprobante enviado.",
      type: "pago",
      link: "/compras",
    });
  }

  await admin.from("admin_logs").insert({
    admin_id: session.userId,
    admin_email: session.email,
    action: `pago_${action}`,
    entity: "payments",
    entity_id: id,
    details: { order_id: payment.order_id, amount: Number(payment.amount) },
  });

  return NextResponse.json({ ok: true });
}
