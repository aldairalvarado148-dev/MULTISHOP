import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "La tienda aún no está configurada en Supabase." }, { status: 503 });
  }

  const { id } = await params;
  const admin = await createSupabaseAdminClient();
  const { data: backup, error } = await admin
    .from("backups")
    .select("id, name, payload, manifest, checksum, created_at, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !backup) return NextResponse.json({ error: "Copia no encontrada." }, { status: 404 });
  if (!backup.payload) {
    return NextResponse.json({ error: "Esta copia no tiene contenido descargable." }, { status: 409 });
  }

  await admin.from("backup_events").insert({
    backup_id: id,
    backup_name: backup.name,
    action: "descargar",
    status: "ok",
    message: "Copia descargada",
    actor_id: session.userId,
    actor_email: session.email,
  });

  const file = JSON.stringify(
    {
      app: "MULTISHOP",
      backup: backup.name,
      created_at: backup.created_at,
      checksum_sha256: backup.checksum,
      manifest: backup.manifest,
      data: backup.payload,
    },
    null,
    2,
  );

  const safeName = String(backup.name).replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-") || "copia";
  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="multishop-${safeName}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
