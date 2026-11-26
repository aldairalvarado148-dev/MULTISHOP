"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate, formatMoney, statusStyle } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";

type OrderRow = Order & { items: OrderItem[] };

const STATUSES = ["pendiente", "pagado", "en_proceso", "entregado", "cancelado", "rechazado"];
const PAYMENT_STATUSES = ["pendiente", "en_revision", "aprobado", "rechazado", "reembolsado"];

export default function OrdersManager({
  orders,
  currency,
  focusId,
}: {
  orders: OrderRow[];
  currency: string;
  focusId?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);
  const [filter, setFilter] = useState("todos");

  const visible = orders.filter((o) => (filter === "todos" ? true : o.status === filter));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {["todos", ...STATUSES].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-full border px-3 py-1 text-[0.7rem] font-bold capitalize transition ${
              filter === status
                ? "border-[#b026ff] bg-[#b026ff]/25 text-white"
                : "border-white/10 bg-white/5 text-[#a291bd] hover:text-white"
            }`}
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="card p-6 text-center text-xs text-[#8f7aab]">No hay pedidos con ese estado.</p>
      )}

      {visible.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          currency={currency}
          open={openId === order.id}
          onToggle={() => setOpenId(openId === order.id ? null : order.id)}
        />
      ))}
    </div>
  );
}

function OrderCard({
  order,
  currency,
  open,
  onToggle,
}: {
  order: OrderRow;
  currency: string;
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const [items, setItems] = useState(
    order.items.map((item) => ({ id: item.id, delivery_data: item.delivery_data ?? "" })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar.");
        return;
      }
      setMessage("Pedido actualizado.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-mono text-xs text-[#c77dff]">{order.order_number}</p>
          <p className="truncate text-sm font-bold text-white">
            {order.customer_name ?? order.customer_email ?? "Cliente"}
          </p>
          <p className="text-[0.7rem] text-[#8f7aab]">{formatDate(order.created_at)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black text-white">{formatMoney(Number(order.total), currency)}</p>
          <span className={`badge ${statusStyle(order.status)} mt-1`}>{order.status}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Estado del pedido</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Order["status"])}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Estado del pago</label>
              <select
                className="input"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as Order["payment_status"])}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="label">Notas internas</label>
            <textarea
              className="input min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Solo visible para administradores"
            />
          </div>

          <div className="mt-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[#8f7aab]">
              Productos y datos de entrega
            </p>
            <div className="mt-2 space-y-2">
              {order.items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-white">
                      {item.quantity} × {item.product_name}
                    </span>
                    <span className="text-[#8f7aab]">
                      {formatMoney(Number(item.subtotal), currency)}
                    </span>
                  </div>
                  <textarea
                    className="input mt-2 min-h-[52px] font-mono text-xs"
                    placeholder="Datos de entrega (usuario, clave, código, enlace…)"
                    value={items[index]?.delivery_data ?? ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, delivery_data: e.target.value } : row)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {order.contact && (
            <p className="mt-3 text-xs text-[#a291bd]">
              Contacto del cliente: <span className="text-white">{order.contact}</span>
            </p>
          )}
          {order.customer_notes && (
            <p className="mt-1 whitespace-pre-line text-xs text-[#a291bd]">
              Nota del cliente: <span className="text-white">{order.customer_notes}</span>
            </p>
          )}

          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
          {message && <p className="mt-3 text-xs text-emerald-300">{message}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ status, payment_status: paymentStatus, admin_notes: notes, items })}
              className="btn btn-primary text-xs"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            {order.payment_status !== "aprobado" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ action: "approve_payment", items, admin_notes: notes })}
                className="btn btn-ghost text-xs"
              >
                ✓ Aprobar pago
              </button>
            )}
            {order.status !== "entregado" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ action: "deliver", items })}
                className="btn btn-ghost text-xs"
              >
                📦 Marcar entregado
              </button>
            )}
            <a href={`/admin/pagos?order=${order.id}`} className="btn btn-ghost text-xs">
              Ver comprobante
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
