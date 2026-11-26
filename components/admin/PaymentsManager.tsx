"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate, formatMoney } from "@/lib/utils";

export type PaymentRow = {
  id: string;
  order_id: string;
  order_number: string | null;
  customer: string | null;
  amount: number;
  method: string;
  reference: string | null;
  proof_url: string | null;
  status: string;
  created_at: string;
};

export type TopupRow = {
  id: string;
  user_id: string;
  customer: string | null;
  amount: number;
  method: string;
  reference: string | null;
  proof_url: string | null;
  status: string;
  created_at: string;
};

export default function PaymentsManager({
  payments,
  topups,
  currency,
}: {
  payments: PaymentRow[];
  topups: TopupRow[];
  currency: string;
}) {
  return (
    <div className="space-y-6">
      <Section
        title="Pagos de pedidos"
        description="Verifica el comprobante antes de aprobar. Al aprobar, el pedido pasa a pagado."
        kind="payment"
        rows={payments.map((p) => ({
          id: p.id,
          title: p.order_number ?? p.order_id,
          subtitle: p.customer ?? "cliente",
          amount: p.amount,
          reference: p.reference,
          proof_url: p.proof_url,
          status: p.status,
          created_at: p.created_at,
        }))}
        currency={currency}
        emptyText="No hay pagos registrados."
      />

      <Section
        title="Recargas de saldo"
        description="Al aprobar, el saldo se acredita realmente en la cuenta del cliente."
        kind="topup"
        rows={topups.map((t) => ({
          id: t.id,
          title: t.customer ?? t.user_id,
          subtitle: "recarga de saldo",
          amount: t.amount,
          reference: t.reference,
          proof_url: t.proof_url,
          status: t.status,
          created_at: t.created_at,
        }))}
        currency={currency}
        emptyText="No hay solicitudes de recarga."
      />
    </div>
  );
}

function Section({
  title,
  description,
  kind,
  rows,
  currency,
  emptyText,
}: {
  title: string;
  description: string;
  kind: "payment" | "topup";
  rows: Array<{
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    reference: string | null;
    proof_url: string | null;
    status: string;
    created_at: string;
  }>;
  currency: string;
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-black uppercase tracking-wide text-white">{title}</h2>
      <p className="mt-1 text-xs text-[#8f7aab]">{description}</p>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && <p className="card p-4 text-xs text-[#8f7aab]">{emptyText}</p>}
        {rows.map((row) => (
          <Row key={row.id} row={row} kind={kind} currency={currency} />
        ))}
      </div>
    </section>
  );
}

function Row({
  row,
  kind,
  currency,
}: {
  row: {
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    reference: string | null;
    proof_url: string | null;
    status: string;
    created_at: string;
  };
  kind: "payment" | "topup";
  currency: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "aprobar" | "rechazar") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payments/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, action, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const pending = row.status === "pendiente" || row.status === "en_revision";

  return (
    <div className="card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-[#c77dff]">{row.title}</p>
          <p className="truncate text-sm font-bold text-white">{row.subtitle}</p>
          <p className="text-[0.7rem] text-[#8f7aab]">
            {formatDate(row.created_at)}
            {row.reference ? ` · ref: ${row.reference}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">{formatMoney(row.amount, currency)}</span>
          <span
            className={`badge ${
              row.status === "aprobado"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : row.status === "rechazado"
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}
          >
            {row.status}
          </span>
        </div>
      </div>

      {row.proof_url && (
        <a
          href={row.proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-[#c77dff] hover:underline"
        >
          Ver comprobante →
        </a>
      )}

      {pending && (
        <div className="mt-2 space-y-2">
          <input
            className="input text-xs"
            placeholder="Nota para el cliente (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("aprobar")}
              className="btn btn-primary text-xs"
            >
              ✓ Aprobar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("rechazar")}
              className="btn btn-ghost text-xs"
            >
              ✕ Rechazar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
