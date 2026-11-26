"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProofUpload({
  orderId,
  hasProof,
  proofUrl,
}: {
  orderId: string;
  hasProof: boolean;
  proofUrl: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Selecciona una imagen o PDF del comprobante.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("reference", reference);
      const res = await fetch(`/api/orders/${orderId}/proof`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir el comprobante.");
        return;
      }
      setOk(true);
      setFile(null);
      router.refresh();
    } catch {
      setError("Error de conexión al subir el comprobante.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-white">Comprobante de pago</h2>
      <p className="mt-1 text-xs text-[#8f7aab]">
        Sube una imagen o PDF. Un administrador verificará el pago antes de confirmar el pedido.
      </p>

      {hasProof && proofUrl && (
        <a
          href={proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-[#c77dff] hover:underline"
        >
          📎 Ver comprobante enviado
        </a>
      )}

      <form onSubmit={submit} className="mt-3 space-y-3">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full cursor-pointer rounded-xl border border-[#b026ff]/25 bg-black/40 px-3 py-2 text-xs text-[#d8c8f2] file:mr-3 file:rounded-lg file:border-0 file:bg-[#b026ff]/25 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
        />
        <input
          className="input"
          placeholder="Referencia / número de operación (opcional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        {error && <p className="text-xs text-rose-300">{error}</p>}
        {ok && <p className="text-xs text-emerald-300">Comprobante enviado. Pago en revisión.</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Subiendo…" : "Enviar comprobante"}
        </button>
      </form>
    </div>
  );
}
