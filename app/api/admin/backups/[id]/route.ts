import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "La tienda aún no está configurada en Supabase." }, { status: 503 });
  }

  const { id } = await params;
  const admin = await createSupabaseAdminClient();
  const { data: backup } = await admin.from("backups").select("id, name").eq("id", id).maybeSingle();
  if (!backup) return NextResponse.json({ error: "Copia no encontrada." }, { status: 404 });

  const { error } = await admin.from("backups").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("backup_events").insert({
    backup_name: backup.name,
    action: "eliminar",
    status: "ok",
    message: "Copia eliminada por el administrador",
    actor_id: session.userId,
    actor_email: session.email,
  });

  await admin.from("admin_logs").insert({
    admin_id: session.userId,
    admin_email: session.email,
    action: "eliminar_copia_seguridad",
    entity: "backups",
    entity_id: id,
    details: { name: backup.name },
  });

  return NextResponse.json({ ok: true });
}
