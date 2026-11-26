"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatBytes } from "@/lib/backups";
import { formatDate } from "@/lib/utils";

export type BackupRow = {
  id: string;
  name: string;
  size_bytes: number;
  records_count: number;
  status: string;
  checksum: string | null;
  created_at: string;
  created_by_email: string | null;
  error: string | null;
  tables: Array<{ table: string; label: string; records: number }>;
  storage: { buckets: string[]; objects: number; note: string } | null;
  excluded: Array<{ item: string; reason: string }>;
};

export default function BackupManager({ rows }: { rows: BackupRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy("crear");
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la copia.");
        return;
      }
      setName("");
      setFeedback(`Copia creada con ${data.records} registros.`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function restore(row: BackupRow) {
    if (
      !window.confirm(
        `¿Restaurar "${row.name}"? Se actualizarán los registros de la copia y antes se creará un respaldo automático del estado actual.`,
      )
    ) {
      return;
    }
    setBusy(row.id);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/backups/${row.id}/restore`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo restaurar.");
        return;
      }
      setFeedback(`${data.message} (${data.total} registros · respaldo previo: ${data.safety_backup})`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(row: BackupRow) {
    if (!window.confirm(`¿Eliminar definitivamente la copia "${row.name}"?`)) return;
    setBusy(row.id);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/backups/${row.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar.");
        return;
      }
      setFeedback("Copia eliminada.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="label" htmlFor="backup-name">
          Nombre de la copia (opcional)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="backup-name"
            className="input"
            placeholder="Copia antes de actualizar precios"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" onClick={create} disabled={busy !== null} className="btn btn-primary shrink-0 text-sm">
            {busy === "crear" ? "Creando…" : "Crear copia"}
          </button>
        </div>
        <p className="mt-2 text-[0.7rem] text-[#8f7aab]">
          Incluye productos, categorías, subcategorías, banners, configuraciones, pedidos, pagos, recargas y
          movimientos de saldo, con verificación de integridad SHA-256.
        </p>
        {error && <p className="mt-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</p>}
        {feedback && (
          <p className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-200">
            {feedback}
          </p>
        )}
      </div>

      {rows.length === 0 && <p className="card p-6 text-center text-xs text-[#8f7aab]">Todavía no hay copias guardadas.</p>}

      {rows.map((row) => (
        <div key={row.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">{row.name}</p>
              <p className="text-[0.7rem] text-[#8f7aab]">
                {formatDate(row.created_at)} · {formatBytes(row.size_bytes)} · {row.records_count} registros ·{" "}
                {row.created_by_email ?? "sistema"}
              </p>
              <p className="mt-1 break-all text-[0.62rem] text-[#6f5c8a]">SHA-256: {row.checksum ?? "—"}</p>
            </div>
            <span className={`badge ${row.status === "completado" ? "text-emerald-300" : "text-rose-300"}`}>
              {row.status}
            </span>
          </div>

          {row.error && <p className="mt-2 text-xs text-rose-300">{row.error}</p>}

          <details className="mt-2 text-[0.7rem] text-[#a291bd]">
            <summary className="cursor-pointer text-[#c77dff]">Contenido de la copia</summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {row.tables.map((table) => (
                <li key={table.table} className="flex justify-between gap-2 border-b border-white/5 py-1">
                  <span>{table.label}</span>
                  <span className="font-bold text-white">{table.records}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Storage: {row.storage?.buckets.length ?? 0} buckets · {row.storage?.objects ?? 0} archivos listados.{" "}
              {row.storage?.note}
            </p>
            {row.excluded.length > 0 && (
              <ul className="mt-2 space-y-1">
                {row.excluded.map((item) => (
                  <li key={item.item}>
                    <span className="font-bold text-[#c9b8e6]">{item.item}:</span> {item.reason}
                  </li>
                ))}
              </ul>
            )}
          </details>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/api/admin/backups/${row.id}/download`}
              className="btn btn-ghost text-xs"
              target="_blank"
              rel="noreferrer"
            >
              Descargar copia
            </a>
            <button
              type="button"
              onClick={() => restore(row)}
              disabled={busy !== null || row.status !== "completado"}
              className="btn btn-primary text-xs"
            >
              {busy === row.id ? "Procesando…" : "Restaurar copia"}
            </button>
            <button
              type="button"
              onClick={() => remove(row)}
              disabled={busy !== null}
              className="btn btn-ghost text-xs text-rose-300"
            >
              Eliminar copia
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
