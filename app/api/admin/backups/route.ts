import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";
import { collectBackup } from "@/lib/backups";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json(
      { error: "Las copias requieren SUPABASE_SERVICE_ROLE_KEY configurada en el servidor." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const admin = await createSupabaseAdminClient();
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const name = (body.name?.trim() || `Copia ${stamp}`).slice(0, 120);

  try {
    const collected = await collectBackup(admin);

    const { data, error } = await admin
      .from("backups")
      .insert({
        name,
        created_by: session.userId,
        created_by_email: session.email,
        size_bytes: collected.sizeBytes,
        records_count: collected.records,
        tables_included: collected.manifest.tables,
        manifest: collected.manifest,
        payload: collected.payload,
        checksum: collected.checksum,
        status: "completado",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await admin.from("backup_events").insert({
      backup_id: data.id,
      backup_name: name,
      action: "crear",
      status: "ok",
      message: `${collected.records} registros · ${collected.manifest.tables.length} tablas`,
      actor_id: session.userId,
      actor_email: session.email,
    });

    await admin.from("admin_logs").insert({
      admin_id: session.userId,
      admin_email: session.email,
      action: "crear_copia_seguridad",
      entity: "backups",
      entity_id: data.id,
      details: { name, records: collected.records, size: collected.sizeBytes },
    });

    return NextResponse.json({ ok: true, id: data.id, records: collected.records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await admin.from("backups").insert({
      name,
      created_by: session.userId,
      created_by_email: session.email,
      status: "fallido",
      error: message.slice(0, 500),
    });
    await admin.from("backup_events").insert({
      backup_name: name,
      action: "fallo",
      status: "error",
      message: message.slice(0, 500),
      actor_id: session.userId,
      actor_email: session.email,
    });
    return NextResponse.json({ error: `No se pudo crear la copia: ${message}` }, { status: 500 });
  }
}
