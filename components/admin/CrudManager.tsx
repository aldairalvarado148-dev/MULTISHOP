"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";

export type AdminField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "checkbox" | "select" | "image";
  options?: Array<{ value: string; label: string; parent?: string | null }>;
  parentField?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  help?: string;
};

export type AdminColumn = {
  key: string;
  label: string;
  type?: "text" | "money" | "bool" | "image" | "code";
};

type Row = Record<string, unknown>;

export default function CrudManager({
  entity,
  title,
  description,
  fields,
  columns,
  rows,
  createLabel = "Crear",
  currency = "USD",
  emptyText = "Sin registros todavía.",
}: {
  entity: string;
  title: string;
  description?: string;
  fields: AdminField[];
  columns: AdminColumn[];
  rows: Row[];
  createLabel?: string;
  currency?: string;
  emptyText?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const blank = useMemo(() => {
    const state: Record<string, string | boolean> = {};
    for (const field of fields) {
      if (field.type === "checkbox") state[field.name] = Boolean(field.defaultValue);
      else state[field.name] = field.defaultValue !== undefined ? String(field.defaultValue) : "";
    }
    return state;
  }, [fields]);

  function openCreate() {
    setForm({ ...blank });
    setEditingId(null);
    setError(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    const state: Record<string, string | boolean> = {};
    for (const field of fields) {
      const value = row[field.name];
      if (field.type === "checkbox") state[field.name] = Boolean(value);
      else state[field.name] = value === null || value === undefined ? "" : String(value);
    }
    setForm(state);
    setEditingId(String(row.id));
    setError(null);
    setOpen(true);
  }

  async function uploadImage(field: string, file: File) {
    setUploading(field);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", entity);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir la imagen.");
        return;
      }
      setForm((prev) => ({ ...prev, [field]: data.url as string }));
    } finally {
      setUploading(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (editingId) payload.id = editingId;
      const res = await fetch(`/api/admin/${entity}`, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      setOpen(false);
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    const label = String(row.name ?? row.title ?? "este registro");
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/admin/${entity}?id=${row.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(data.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  async function toggleActive(row: Row) {
    const res = await fetch(`/api/admin/${entity}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  function cell(row: Row, column: AdminColumn) {
    const value = row[column.key];
    if (column.type === "money") return formatMoney(Number(value ?? 0), currency);
    if (column.type === "bool") return value ? "Sí" : "No";
    if (column.type === "image") {
      return typeof value === "string" && value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-9 w-9 rounded-lg object-cover" />
      ) : (
        <span className="text-[#6f5c8a]">—</span>
      );
    }
    if (column.type === "code") return <span className="font-mono text-[0.7rem]">{String(value ?? "—")}</span>;
    return value === null || value === undefined || value === "" ? "—" : String(value);
  }

  const visibleFields = fields.filter((field) => {
    if (!field.parentField) return true;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-xs text-[#a291bd]">{description}</p>}
        </div>
        <button type="button" onClick={openCreate} className="btn btn-primary text-xs">
          + {createLabel}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              {editingId ? "Editar registro" : "Nuevo registro"}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-[#8f7aab] hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleFields.map((field) => {
              const value = form[field.name];
              const parentValue = field.parentField ? String(form[field.parentField] ?? "") : null;
              const options = field.options?.filter(
                (opt) => !field.parentField || !opt.parent || opt.parent === parentValue,
              );

              return (
                <div
                  key={field.name}
                  className={field.type === "textarea" || field.type === "image" ? "sm:col-span-2" : ""}
                >
                  {field.type === "checkbox" ? (
                    <label className="mt-5 flex items-center gap-2 text-xs font-bold text-[#c9b8e6]">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setForm({ ...form, [field.name]: e.target.checked })}
                        className="h-4 w-4 accent-[#b026ff]"
                      />
                      {field.label}
                    </label>
                  ) : (
                    <>
                      <label className="label" htmlFor={`${entity}-${field.name}`}>
                        {field.label}
                        {field.required && <span className="text-[#c77dff]"> *</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          id={`${entity}-${field.name}`}
                          className="input min-h-[80px]"
                          value={String(value ?? "")}
                          placeholder={field.placeholder}
                          onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                        />
                      ) : field.type === "select" ? (
                        <select
                          id={`${entity}-${field.name}`}
                          className="input"
                          value={String(value ?? "")}
                          onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                        >
                          <option value="">— Seleccionar —</option>
                          {(options ?? []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "image" ? (
                        <div className="space-y-2">
                          <input
                            id={`${entity}-${field.name}`}
                            className="input"
                            value={String(value ?? "")}
                            placeholder="https://…"
                            onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                          />
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadImage(field.name, file);
                              }}
                              className="block w-full cursor-pointer rounded-xl border border-[#b026ff]/25 bg-black/40 px-3 py-2 text-xs text-[#d8c8f2] file:mr-3 file:rounded-lg file:border-0 file:bg-[#b026ff]/25 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                            />
                            {uploading === field.name && (
                              <span className="text-xs text-[#c77dff]">Subiendo…</span>
                            )}
                            {typeof value === "string" && value && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={value} alt="" className="h-10 w-10 rounded-lg object-cover" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <input
                          id={`${entity}-${field.name}`}
                          className="input"
                          type={field.type === "number" ? "number" : "text"}
                          step={field.type === "number" ? "any" : undefined}
                          value={String(value ?? "")}
                          placeholder={field.placeholder}
                          onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                        />
                      )}
                      {field.help && <p className="mt-1 text-[0.65rem] text-[#6f5c8a]">{field.help}</p>}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {error && <p className="text-xs text-rose-300">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn btn-primary text-xs">
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : createLabel}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost text-xs">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-black/40 text-[0.65rem] uppercase tracking-wider text-[#8f7aab]">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-2 font-bold">
                    {column.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-[#8f7aab]">
                    {emptyText}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={String(row.id)} className="text-[#c9b8e6]">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2">
                      {cell(row, column)}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-[#c77dff] hover:underline"
                      >
                        Editar
                      </button>
                      {"is_active" in row && (
                        <button
                          type="button"
                          onClick={() => toggleActive(row)}
                          className={row.is_active ? "text-amber-300 hover:underline" : "text-emerald-300 hover:underline"}
                        >
                          {row.is_active ? "Desactivar" : "Activar"}
                        </button>
                      )}
                      <button type="button" onClick={() => remove(row)} className="text-rose-300 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
