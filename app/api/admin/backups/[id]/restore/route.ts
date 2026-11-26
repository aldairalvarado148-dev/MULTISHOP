import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";
import { collectBackup, restoreBackup, type BackupPayload } from "@/lib/backups";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const { id } = await params;
  const admin = await createSupabaseAdminClient();
  const { data: backup } = await admin
    .from("backups")
    .select("id, name, payload, status")
    .eq("id", id)
    .maybeSingle();

  if (!backup) return NextResponse.json({ error: "Copia no encontrada." }, { status: 404 });
  if (!backup.payload) {
    return NextResponse.json({ error: "Esta copia no tiene datos restaurables." }, { status: 409 });
  }

  try {
    // Respaldo automático del estado actual antes de restaurar.
    const safety = await collectBackup(admin);
    const safetyName = `Pre-restauración ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const { data: safetyRow } = await admin
      .from("backups")
      .insert({
        name: safetyName,
        created_by: session.userId,
        created_by_email: session.email,
        size_bytes: safety.sizeBytes,
        records_count: safety.records,
        tables_included: safety.manifest.tables,
        manifest: safety.manifest,
        payload: safety.payload,
        checksum: safety.checksum,
        status: "completado",
      })
      .select("id")
      .single();

    await admin.from("backup_events").insert({
      backup_id: safetyRow?.id ?? null,
      backup_name: safetyName,
      action: "crear",
      status: "ok",
      message: "Respaldo automático previo a la restauración",
      actor_id: session.userId,
      actor_email: session.email,
    });

    const result = await restoreBackup(admin, backup.payload as BackupPayload);
    const failures = result.restored.filter((item) => item.error);

    await admin.from("backup_events").insert({
      backup_id: id,
      backup_name: backup.name,
      action: "restaurar",
      status: failures.length ? "error" : "ok",
      message: failures.length
        ? `${result.total} registros restaurados. Errores: ${failures.map((f) => f.table).join(", ")}`
        : `${result.total} registros restaurados`,
      actor_id: session.userId,
      actor_email: session.email,
    });

    await admin.from("admin_logs").insert({
      admin_id: session.userId,
      admin_email: session.email,
      action: "restaurar_copia_seguridad",
      entity: "backups",
      entity_id: id,
      details: { name: backup.name, total: result.total, failures: failures.length },
    });

    return NextResponse.json({
      ok: failures.length === 0,
      total: result.total,
      tables: result.restored,
      safety_backup: safetyName,
      message: failures.length
        ? "Restauración parcial. Revisa el detalle por tabla."
        : "Restauración completada. Se guardó un respaldo del estado anterior.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await admin.from("backup_events").insert({
      backup_id: id,
      backup_name: backup.name,
      action: "restaurar",
      status: "error",
      message: message.slice(0, 500),
      actor_id: session.userId,
      actor_email: session.email,
    });
    return NextResponse.json({ error: `No se pudo restaurar: ${message}` }, { status: 500 });
  }
}
