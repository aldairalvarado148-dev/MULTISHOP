"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

type Props = {
  initialItems: CartItem[];
  currency: string;
  balance: number;
  paymentInstructions: string;
};

export default function CartView({ initialItems, currency, balance, paymentInstructions }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [method, setMethod] = useState<"saldo" | "transferencia">(
    balance > 0 ? "saldo" : "transferencia",
  );
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.product.price) * item.quantity, 0),
    [items],
  );
  const canPayWithBalance = balance >= subtotal && subtotal > 0;

  async function updateQuantity(itemId: string, quantity: number) {
    setBusyId(itemId);
    setError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar el carrito.");
        return;
      }
      setItems(data.items ?? []);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(itemId: string) {
    setBusyId(itemId);
    setError(null);
    try {
      const res = await fetch(`/api/cart?itemId=${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems(data.items ?? []);
        router.refresh();
      } else {
        setError(data.error ?? "No se pudo quitar el producto.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function checkout(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method,
          contact,
          notes,
          idempotencyKey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el pedido.");
        return;
      }
      router.push(`/compras/${data.orderId}?nuevo=1`);
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="text-4xl">🛒</span>
        <h2 className="text-lg font-bold text-white">Tu carrito está vacío</h2>
        <p className="max-w-sm text-sm text-[#a291bd]">
          Explora el catálogo y agrega productos de Free Fire o Streaming.
        </p>
        <Link href="/catalogo" className="btn btn-primary mt-2">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {items.map((item) => {
          const price = Number(item.product.price);
          const available = item.product.is_active && item.product.stock > 0;
          return (
            <div key={item.id} className="card flex gap-3 p-3 sm:p-4">
              <Link
                href={`/producto/${item.product.slug}`}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#b026ff]/20 bg-black/40"
              >
                {item.product.image_url ? (
                  <Image
                    src={item.product.image_url}
                    alt={item.product.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl">🛍️</span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/producto/${item.product.slug}`}
                      className="line-clamp-2 text-sm font-bold text-white hover:text-[#c77dff]"
                    >
                      {item.product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#8f7aab]">
                      {formatMoney(price, currency)} · {item.product.delivery_type === "automatica" ? "⚡ automática" : "manual"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={busyId === item.id}
                    className="text-xs text-rose-300 hover:underline disabled:opacity-50"
                    aria-label={`Quitar ${item.product.name}`}
                  >
                    Quitar
                  </button>
                </div>

                {!available && (
                  <p className="mt-1 text-xs text-amber-300">Sin stock disponible ahora</p>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={busyId === item.id || item.quantity <= 1}
                      className="h-8 w-8 rounded-lg border border-[#b026ff]/25 bg-black/40 text-sm text-white disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={busyId === item.id || item.quantity >= 99}
                      className="h-8 w-8 rounded-lg border border-[#b026ff]/25 bg-black/40 text-sm text-white disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-black text-white">
                    {formatMoney(price * item.quantity, currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <form onSubmit={checkout} className="card space-y-4 p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Resumen del pedido</h2>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-[#a291bd]">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-base font-black text-white">
              <span>Total</span>
              <span className="neon-text">{formatMoney(subtotal, currency)}</span>
            </div>
          </div>

          <div>
            <p className="label">Método de pago</p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#b026ff]/25 bg-black/30 px-3 py-2 text-xs text-[#d8c8f2]">
                <input
                  type="radio"
                  name="method"
                  checked={method === "saldo"}
                  onChange={() => setMethod("saldo")}
                  className="accent-[#b026ff]"
                />
                <span className="flex-1">Saldo disponible</span>
                <span className="font-bold text-white">{formatMoney(balance, currency)}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#b026ff]/25 bg-black/30 px-3 py-2 text-xs text-[#d8c8f2]">
                <input
                  type="radio"
                  name="method"
                  checked={method === "transferencia"}
                  onChange={() => setMethod("transferencia")}
                  className="accent-[#b026ff]"
                />
                <span className="flex-1">Transferencia / comprobante</span>
              </label>
            </div>
            {method === "saldo" && !canPayWithBalance && (
              <p className="mt-2 text-xs text-amber-300">
                Saldo insuficiente. Recarga en tu sección SALDO o elige transferencia.
              </p>
            )}
            {method === "transferencia" && (
              <p className="mt-2 whitespace-pre-line text-xs text-[#8f7aab]">
                {paymentInstructions}
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="contact">
              Contacto (WhatsApp / Discord / correo)
            </label>
            <input
              id="contact"
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Para coordinar tu entrega"
            />
          </div>

          <div>
            <label className="label" htmlFor="notes">
              Notas del pedido (opcional)
            </label>
            <textarea
              id="notes"
              className="input min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ID de jugador, correo de la cuenta, etc."
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || (method === "saldo" && !canPayWithBalance)}
            className="btn btn-primary w-full"
          >
            {submitting ? "Creando pedido…" : "Confirmar pedido"}
          </button>

          <p className="text-center text-[0.68rem] leading-relaxed text-[#8f7aab]">
            El pedido se verifica antes de confirmarse. Nunca se cobra dos veces el mismo carrito.
          </p>
        </form>
      </aside>
    </div>
  );
}
