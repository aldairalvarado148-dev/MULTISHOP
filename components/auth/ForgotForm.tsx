"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el correo.");
        return;
      }
      setSent(true);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu
        contraseña. Revisa también la carpeta de spam.
        <div className="mt-3">
          <Link href="/login" className="btn btn-ghost w-full">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="forgot-email">
          Correo electrónico
        </label>
        <input
          id="forgot-email"
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
        />
      </div>
      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "Enviando…" : "Enviar enlace de recuperación"}
      </button>
      <Link href="/login" className="block text-center text-xs text-[#c77dff] hover:underline">
        Volver al inicio de sesión
      </Link>
    </form>
  );
}
