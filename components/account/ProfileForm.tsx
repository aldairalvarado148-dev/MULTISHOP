"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string;
  email: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName, phone });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, phone: form.phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      setMessage("Datos actualizados.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <h2 className="text-sm font-black uppercase tracking-wide text-white">Mis datos</h2>

      <div>
        <label className="label" htmlFor="fullName">
          Nombre completo
        </label>
        <input
          id="fullName"
          className="input"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          placeholder="Tu nombre"
        />
      </div>

      <div>
        <label className="label" htmlFor="phone">
          Teléfono / WhatsApp
        </label>
        <input
          id="phone"
          className="input"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+1 555 555 5555"
        />
      </div>

      <div>
        <label className="label">Correo</label>
        <input className="input opacity-60" value={email} readOnly />
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}
      {message && <p className="text-xs text-emerald-300">{message}</p>}

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
