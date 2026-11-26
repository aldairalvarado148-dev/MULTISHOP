"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

export type TicketRow = {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  customer: string;
  order_number: string | null;
};

export default function SupportManager({ rows }: { rows: TicketRow[] }) {
  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="card p-6 text-center text-xs text-[#8f7aab]">No hay tickets de soporte.</p>}
      {rows.map((row) => (
        <Ticket key={row.id} row={row} />
      ))}
    </div>
  );
}

function Ticket({ row }: { row: TicketRow }) {
  const router = useRouter();
  const [reply, setReply] = useState(row.admin_reply ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(status?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_reply: reply, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo responder.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-white">{row.subject}</p>
          <p className="text-[0.7rem] text-[#8f7aab]">
            {row.customer} · {formatDate(row.created_at)}
            {row.order_number ? ` · pedido ${row.order_number}` : ""}
          </p>
        </div>
        <span className="badge">{row.status}</span>
      </div>
      <p className="mt-2 whitespace-pre-line rounded-xl border border-white/10 bg-black/30 p-2 text-xs text-[#c9b8e6]">
        {row.message}
      </p>
      <textarea
        className="input mt-2 min-h-[60px] text-xs"
        placeholder="Respuesta al cliente…"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />
      {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => send("en_proceso")} className="btn btn-primary text-xs">
          {busy ? "Enviando…" : "Responder"}
        </button>
        <button type="button" disabled={busy} onClick={() => send("cerrado")} className="btn btn-ghost text-xs">
          Cerrar ticket
        </button>
      </div>
    </div>
  );
}
