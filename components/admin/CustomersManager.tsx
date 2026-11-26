"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate, formatMoney } from "@/lib/utils";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  is_blocked: boolean;
  orders: number;
  created_at: string;
};

export default function CustomersManager({ rows, currency }: { rows: CustomerRow[]; currency: string }) {
  const [query, setQuery] = useState("");
  const visible = rows.filter((row) =>
    `${row.name} ${row.email}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <input
        className="input text-xs"
        placeholder="Buscar cliente…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="bg-black/40 text-[0.65rem] uppercase tracking-wider text-[#8f7aab]">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Pedidos</th>
              <th className="px-3 py-2">Saldo</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[#8f7aab]">
                  Sin clientes que coincidan.
                </td>
              </tr>
            )}
            {visible.map((row) => (
              <CustomerRowView key={row.id} row={row} currency={currency} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerRowView({ row, currency }: { row: CustomerRow; currency: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "No se pudo actualizar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="text-[#c9b8e6]">
      <td className="px-3 py-2">
        <p className="font-bold text-white">{row.name}</p>
        <p className="text-[0.7rem] text-[#8f7aab]">{row.email}</p>
        <p className="text-[0.65rem] text-[#6f5c8a]">Desde {formatDate(row.created_at, false)}</p>
      </td>
      <td className="px-3 py-2">
        <span className={`badge ${row.role === "admin" ? "text-[#c77dff]" : ""}`}>{row.role}</span>
      </td>
      <td className="px-3 py-2">{row.orders}</td>
      <td className="px-3 py-2 font-bold text-white">{formatMoney(row.balance, currency)}</td>
      <td className="px-3 py-2">
        {row.is_blocked ? <span className="text-rose-300">Bloqueado</span> : <span className="text-emerald-300">Activo</span>}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => update({ role: row.role === "admin" ? "cliente" : "admin" })}
            className="text-[#c77dff] hover:underline disabled:opacity-50"
          >
            {row.role === "admin" ? "Quitar admin" : "Hacer admin"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => update({ is_blocked: !row.is_blocked })}
            className={row.is_blocked ? "text-emerald-300 hover:underline" : "text-rose-300 hover:underline"}
          >
            {row.is_blocked ? "Desbloquear" : "Bloquear"}
          </button>
        </div>
      </td>
    </tr>
  );
}
