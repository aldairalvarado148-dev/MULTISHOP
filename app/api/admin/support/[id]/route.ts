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
    status?: "abierto" | "en_proceso" | "cerrado";
    admin_reply?: string;
  };

  const patch: Record<string, unknown> = {};
  if (body.status && ["abierto", "en_proceso", "cerrado"].includes(body.status)) patch.status = body.status;
  if (typeof body.admin_reply === "string" && body.admin_reply.trim()) {
    patch.admin_reply = body.admin_reply.slice(0, 2000);
    patch.replied_at = new Date().toISOString();
    if (!patch.status) patch.status = "en_proceso";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const admin = await createSupabaseAdminClient();
  const { data: ticket } = await admin.from("support_tickets").select("*").eq("id", id).maybeSingle();
  if (!ticket) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });

  const { error } = await admin.from("support_tickets").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (ticket.user_id && patch.admin_reply) {
    await admin.from("notifications").insert({
      user_id: ticket.user_id,
      title: "Respuesta de soporte",
      body: String(patch.admin_reply).slice(0, 200),
      type: "soporte",
      link: "/soporte",
    });
  }

  await admin.from("admin_logs").insert({
    admin_id: session.userId,
    admin_email: session.email,
    action: "responder_soporte",
    entity: "support_tickets",
    entity_id: id,
    details: { status: patch.status ?? ticket.status },
  });

  return NextResponse.json({ ok: true });
}
