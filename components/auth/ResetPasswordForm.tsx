"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar la contraseña.");
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/cuenta");
        router.refresh();
      }, 1200);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
        Contraseña actualizada. Redirigiendo a tu cuenta…
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="new-password">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">
          Confirmar contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite la contraseña"
        />
      </div>
      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
