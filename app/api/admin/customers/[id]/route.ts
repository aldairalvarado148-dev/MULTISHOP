import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasServiceRole()) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol o bloqueo." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    role?: "cliente" | "admin";
    is_blocked?: boolean;
    notes?: string;
  };

  const patch: Record<string, unknown> = {};
  if (body.role === "admin" || body.role === "cliente") patch.role = body.role;
  if (typeof body.is_blocked === "boolean") patch.is_blocked = body.is_blocked;
  if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 1000) || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("admin_logs").insert({
    admin_id: session.userId,
    admin_email: session.email,
    action: "actualizar_cliente",
    entity: "profiles",
    entity_id: id,
    details: patch,
  });

  return NextResponse.json({ ok: true });
}
