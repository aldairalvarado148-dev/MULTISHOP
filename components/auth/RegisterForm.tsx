"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la cuenta.");
        return;
      }
      if (data.needsConfirmation) {
        setNotice(
          "Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.",
        );
        return;
      }
      router.push(next || "/");
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="fullName">
          Nombre completo
        </label>
        <input
          id="fullName"
          required
          className="input"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          placeholder="Tu nombre"
        />
      </div>
      <div>
        <label className="label" htmlFor="reg-email">
          Correo electrónico
        </label>
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="tu@correo.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          WhatsApp / teléfono (opcional)
        </label>
        <input
          id="phone"
          className="input"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="+57 300 000 0000"
        />
      </div>
      <div>
        <label className="label" htmlFor="reg-password">
          Contraseña
        </label>
        <input
          id="reg-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {notice}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
