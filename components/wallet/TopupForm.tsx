"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TopupForm({
  currency,
  instructions,
}: {
  currency: string;
  instructions: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Ingresa un monto válido mayor a 0.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("amount", String(value));
      form.append("reference", reference);
      if (file) form.append("file", file);
      const res = await fetch("/api/wallet/topup", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar la solicitud.");
        return;
      }
      setOk(true);
      setAmount("");
      setReference("");
      setFile(null);
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-white">Recargar saldo</h2>
      <p className="whitespace-pre-line text-xs text-[#8f7aab]">{instructions}</p>

      <div>
        <label className="label" htmlFor="amount">
          Monto ({currency})
        </label>
        <input
          id="amount"
          className="input"
          inputMode="decimal"
          placeholder="10.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="reference">
          Referencia del pago
        </label>
        <input
          id="reference"
          className="input"
          placeholder="Número de operación"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="proof">
          Comprobante (imagen o PDF)
        </label>
        <input
          id="proof"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full cursor-pointer rounded-xl border border-[#b026ff]/25 bg-black/40 px-3 py-2 text-xs text-[#d8c8f2] file:mr-3 file:rounded-lg file:border-0 file:bg-[#b026ff]/25 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
        />
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}
      {ok && (
        <p className="text-xs text-emerald-300">
          Solicitud enviada. Tu saldo se acredita cuando el administrador verifique el pago.
        </p>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "Enviando…" : "Solicitar recarga"}
      </button>
    </form>
  );
}
