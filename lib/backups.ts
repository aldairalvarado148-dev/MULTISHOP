import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tablas incluidas en las copias de seguridad de MULTISHOP.
 * `conflict` es la clave usada al restaurar (upsert).
 */
export const BACKUP_TABLES: Array<{ table: string; conflict: string; label: string }> = [
  { table: "categories", conflict: "id", label: "Categorías" },
  { table: "subcategories", conflict: "id", label: "Subcategorías" },
  { table: "products", conflict: "id", label: "Productos" },
  { table: "banners", conflict: "id", label: "Banners" },
  { table: "settings", conflict: "key", label: "Configuraciones" },
  { table: "orders", conflict: "id", label: "Pedidos" },
  { table: "order_items", conflict: "id", label: "Detalles de pedidos" },
  { table: "payments", conflict: "id", label: "Pagos" },
  { table: "wallet_topups", conflict: "id", label: "Recargas de saldo" },
  { table: "wallet_transactions", conflict: "id", label: "Movimientos de saldo" },
  { table: "support_tickets", conflict: "id", label: "Tickets de soporte" },
];

export type BackupManifest = {
  tables: Array<{ table: string; label: string; records: number }>;
  storage: {
    buckets: string[];
    objects: number;
    included_binary: false;
    note: string;
  };
  excluded: Array<{ item: string; reason: string }>;
  app: string;
  generated_at: string;
};

export type BackupPayload = {
  version: number;
  created_at: string;
  tables: Record<string, unknown[]>;
};

export type CollectedBackup = {
  payload: BackupPayload;
  manifest: BackupManifest;
  records: number;
  sizeBytes: number;
  checksum: string;
};

const EXCLUDED = [
  { item: "Cuentas y contraseñas (Supabase Auth)", reason: "Gestionadas por Supabase Auth; usa el respaldo del proyecto en Supabase." },
  { item: "Archivos multimedia de Storage", reason: "El contenido binario no se incluye en la copia; se listan los buckets y se respaldan por separado." },
  { item: "Perfiles de clientes (profiles)", reason: "Datos personales; se mantienen en la base y no viajan dentro de la copia descargable." },
  { item: "Historial de copias y registros (backups, backup_events, admin_logs)", reason: "Se conserva para auditoría y no se restaura." },
];

async function listStorage(admin: SupabaseClient) {
  try {
    const { data: buckets } = await admin.storage.listBuckets();
    const names = (buckets ?? []).map((bucket) => bucket.name);
    let objects = 0;
    for (const name of names) {
      const { data: files } = await admin.storage.from(name).list("", { limit: 1000 });
      objects += files?.filter((file) => file.id).length ?? 0;
    }
    return {
      buckets: names,
      objects,
      included_binary: false as const,
      note: "Solo se registran los buckets y la cantidad de archivos. Descarga los archivos desde Supabase Storage para un respaldo completo de multimedia.",
    };
  } catch {
    return {
      buckets: [] as string[],
      objects: 0,
      included_binary: false as const,
      note: "No se pudo listar Storage en este momento; el respaldo de archivos debe hacerse por separado.",
    };
  }
}

export async function collectBackup(admin: SupabaseClient): Promise<CollectedBackup> {
  const tables: Record<string, unknown[]> = {};
  const manifestTables: BackupManifest["tables"] = [];
  let records = 0;

  for (const config of BACKUP_TABLES) {
    const { data, error } = await admin.from(config.table).select("*").limit(20000);
    if (error) {
      throw new Error(`No se pudo respaldar ${config.table}: ${error.message}`);
    }
    const rows = (data as unknown[] | null) ?? [];
    tables[config.table] = rows;
    records += rows.length;
    manifestTables.push({ table: config.table, label: config.label, records: rows.length });
  }

  const payload: BackupPayload = {
    version: 1,
    created_at: new Date().toISOString(),
    tables,
  };

  const serialized = JSON.stringify(payload);
  const checksum = createHash("sha256").update(serialized).digest("hex");

  const manifest: BackupManifest = {
    tables: manifestTables,
    storage: await listStorage(admin),
    excluded: EXCLUDED,
    app: "MULTISHOP",
    generated_at: new Date().toISOString(),
  };

  return {
    payload,
    manifest,
    records,
    sizeBytes: Buffer.byteLength(serialized, "utf8"),
    checksum,
  };
}

export type RestoreResult = {
  restored: Array<{ table: string; rows: number; error?: string }>;
  total: number;
};

export async function restoreBackup(
  admin: SupabaseClient,
  payload: BackupPayload,
): Promise<RestoreResult> {
  const restored: RestoreResult["restored"] = [];
  let total = 0;

  for (const config of BACKUP_TABLES) {
    const rows = payload.tables?.[config.table];
    if (!Array.isArray(rows) || rows.length === 0) {
      restored.push({ table: config.table, rows: 0 });
      continue;
    }
    let count = 0;
    let failure: string | undefined;
    for (let index = 0; index < rows.length; index += 200) {
      const chunk = rows.slice(index, index + 200) as Record<string, unknown>[];
      const { error } = await admin
        .from(config.table)
        .upsert(chunk, { onConflict: config.conflict, ignoreDuplicates: false });
      if (error) {
        failure = error.message;
        break;
      }
      count += chunk.length;
    }
    total += count;
    restored.push({ table: config.table, rows: count, error: failure });
  }

  return { restored, total };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
