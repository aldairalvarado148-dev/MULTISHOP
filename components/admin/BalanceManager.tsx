"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/utils";

export type BalanceRow = {
  id: string;
  name: string;
  email: string;
  balance: number;
  is_blocked: boolean;
};

export default function BalanceManager({ rows, currency }: { rows: BalanceRow[]; currency: string }) {
  const [query, setQuery] = useState("");
  const visible = rows.filter((row) =>
    `${row.name} ${row.email}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <input
        className="input text-xs"
        placeholder="Buscar cliente por nombre o correo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {visible.length === 0 && <p className="card p-4 text-xs text-[#8f7aab]">Sin clientes que coincidan.</p>}
      <div className="space-y-2">
        {visible.map((row) => (
          <BalanceCard key={row.id} row={row} currency={currency} />
        ))}
      </div>
    </div>
  );
}

function BalanceCard({ row, currency }: { row: BalanceRow; currency: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credito" | "debito">("credito");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function apply() {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Monto inválido.");
      return;
    }
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.id, type, amount: value, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo aplicar.");
        return;
      }
      setOk(true);
      setAmount("");
      setDescription("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{row.name}</p>
          <p className="truncate text-[0.7rem] text-[#8f7aab]">{row.email}</p>
        </div>
        <div className="text-right">
          <p className="text-[0.6rem] uppercase tracking-wider text-[#8f7aab]">Saldo</p>
          <p className="text-sm font-black text-[#c77dff]">{formatMoney(row.balance, currency)}</p>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[110px_110px_1fr_auto]">
        <select className="input text-xs" value={type} onChange={(e) => setType(e.target.value as "credito" | "debito")}>
          <option value="credito">Acreditar</option>
          <option value="debito">Debitar</option>
        </select>
        <input
          className="input text-xs"
          inputMode="decimal"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="input text-xs"
          placeholder="Motivo (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="button" disabled={busy} onClick={apply} className="btn btn-primary text-xs">
          {busy ? "…" : "Aplicar"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      {ok && <p className="mt-1 text-xs text-emerald-300">Saldo actualizado.</p>}
    </div>
  );
}
