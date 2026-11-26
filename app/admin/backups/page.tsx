import BackupManager, { type BackupRow } from "@/components/admin/BackupManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDataAccess } from "@/lib/env";
import type { BackupManifest } from "@/lib/backups";

export const dynamic = "force-dynamic";

type BackupRecord = {
  id: string;
  name: string;
  size_bytes: number;
  records_count: number;
  status: string;
  checksum: string | null;
  created_at: string;
  created_by_email: string | null;
  error: string | null;
  manifest: BackupManifest | null;
};

export default async function AdminBackupsPage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasDataAccess() ? await createSupabaseAdminClient() : await createSupabaseServerClient();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const { data } = await supabase
    .from("backups")
    .select("id, name, size_bytes, records_count, status, checksum, created_at, created_by_email, error, manifest")
    .order("created_at", { ascending: false })
    .limit(40);

  const rows: BackupRow[] = ((data as BackupRecord[] | null) ?? []).map((backup) => ({
    id: backup.id,
    name: backup.name,
    size_bytes: Number(backup.size_bytes ?? 0),
    records_count: backup.records_count ?? 0,
    status: backup.status,
    checksum: backup.checksum,
    created_at: backup.created_at,
    created_by_email: backup.created_by_email,
    error: backup.error,
    tables: backup.manifest?.tables ?? [],
    storage: backup.manifest?.storage
      ? {
          buckets: backup.manifest.storage.buckets ?? [],
          objects: backup.manifest.storage.objects ?? 0,
          note: backup.manifest.storage.note ?? "",
        }
      : null,
    excluded: backup.manifest?.excluded ?? [],
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Copias de seguridad</h1>
      <p className="mt-1 text-xs text-[#a291bd]">
        Respaldos reales almacenados en Supabase, con descarga en JSON, restauración verificada y respaldo
        automático del estado actual antes de restaurar.
      </p>

      {!hasDataAccess() && (
        <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          Falta SUPABASE_SERVICE_ROLE_KEY en el servidor: crear, restaurar y eliminar copias quedará deshabilitado.
        </p>
      )}

      <div className="mt-4">
        <BackupManager rows={rows} />
      </div>
    </div>
  );
}
