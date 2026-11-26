"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type SettingsField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "checkbox";
  placeholder?: string;
  help?: string;
};

export default function SettingsForm({
  settingKey,
  initial,
  fields,
  submitLabel = "Guardar cambios",
  dangerToggle,
}: {
  settingKey: "store" | "maintenance";
  initial: Record<string, unknown>;
  fields: SettingsField[];
  submitLabel?: string;
  dangerToggle?: { name: string; onLabel: string; offLabel: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set(name: string, value: unknown) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value: form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      setMessage("Configuración guardada correctamente.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const enabled = dangerToggle ? Boolean(form[dangerToggle.name]) : false;

  return (
    <div className="card space-y-3 p-4">
      {dangerToggle && (
        <button
          type="button"
          onClick={() => set(dangerToggle.name, !enabled)}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${
            enabled
              ? "border-rose-400/60 bg-rose-500/10"
              : "border-emerald-400/40 bg-emerald-500/5"
          }`}
        >
          <span>
            <span className="block text-sm font-black text-white">
              {enabled ? dangerToggle.onLabel : dangerToggle.offLabel}
            </span>
            <span className="block text-[0.7rem] text-[#a291bd]">
              {enabled
                ? "La tienda está bloqueada para clientes. El panel admin sigue disponible."
                : "La tienda está abierta y recibiendo pedidos."}
            </span>
          </span>
          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              enabled ? "bg-rose-500" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                enabled ? "left-6" : "left-1"
              }`}
            />
          </span>
        </button>
      )}

      {fields.map((field) => (
        <div key={field.name}>
          <label className="label" htmlFor={`${settingKey}-${field.name}`}>
            {field.label}
          </label>
          {field.type === "textarea" ? (
            <textarea
              id={`${settingKey}-${field.name}`}
              className="input min-h-[80px]"
              placeholder={field.placeholder}
              value={String(form[field.name] ?? "")}
              onChange={(e) => set(field.name, e.target.value)}
            />
          ) : (
            <input
              id={`${settingKey}-${field.name}`}
              className="input"
              type={field.type === "date" ? "date" : "text"}
              placeholder={field.placeholder}
              value={String(form[field.name] ?? "")}
              onChange={(e) => set(field.name, e.target.value)}
            />
          )}
          {field.help && <p className="mt-1 text-[0.68rem] text-[#8f7aab]">{field.help}</p>}
        </div>
      ))}

      {error && <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</p>}
      {message && (
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-200">{message}</p>
      )}

      <button type="button" onClick={save} disabled={busy} className="btn btn-primary w-full text-sm">
        {busy ? "Guardando…" : submitLabel}
      </button>
    </div>
  );
}
