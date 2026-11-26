import Link from "next/link";
import { notFound } from "next/navigation";
import ProofUpload from "@/components/orders/ProofUpload";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/settings";
import { resolveProofLink } from "@/lib/storage";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Order, OrderItem, Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente de pago",
  pagado: "Pagado",
  en_proceso: "En proceso",
  entregado: "Entregado",
  cancelado: "Cancelado",
  rechazado: "Rechazado",
};

const PAYMENT_LABEL: Record<string, string> = {
  pendiente: "Pago pendiente",
  en_revision: "Pago en revisión",
  aprobado: "Pago aprobado",
  rechazado: "Pago rechazado",
  reembolsado: "Reembolsado",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const session = await getSession();
  const store = await getStoreSettings();

  if (!session.userId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-xl font-black text-white">Inicia sesión</h1>
        <p className="mt-2 text-sm text-[#a291bd]">Necesitas tu cuenta para ver este pedido.</p>
        <Link href={`/login?next=/compras/${id}`} className="btn btn-primary mt-4">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!order) notFound();
  const o = order as Order;

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", o.id).order("created_at"),
    supabase.from("payments").select("*").eq("order_id", o.id).order("created_at", { ascending: false }),
  ]);

  const orderItems = (items as OrderItem[] | null) ?? [];
  const payment = ((payments as Payment[] | null) ?? [])[0] ?? null;
  const needsProof = o.payment_method !== "saldo" && o.payment_status !== "aprobado";
  // El comprobante está en un bucket privado: se firma un enlace temporal.
  const proofLink = await resolveProofLink(payment?.proof_url ?? null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/compras" className="text-xs text-[#c77dff] hover:underline">
        ← Volver a mis compras
      </Link>

      {nuevo && (
        <div className="card mt-4 border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm font-bold text-emerald-200">¡Pedido creado con éxito!</p>
          <p className="mt-1 text-xs text-emerald-100/80">
            {o.payment_method === "saldo"
              ? "Tu pago fue aprobado automáticamente con saldo. Procesaremos la entrega en breve."
              : "Envía tu comprobante para que verifiquemos el pago y procesemos la entrega."}
          </p>
        </div>
      )}

      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-[#c77dff]">{o.order_number}</p>
            <h1 className="mt-1 text-2xl font-black text-white">
              {formatMoney(Number(o.total), store.currency)}
            </h1>
            <p className="mt-1 text-xs text-[#8f7aab]">Creado el {formatDate(o.created_at)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`badge badge-${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
            <span className="badge">{PAYMENT_LABEL[o.payment_status] ?? o.payment_status}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-xs text-[#a291bd] sm:grid-cols-2">
          <p>
            <span className="text-[#8f7aab]">Método de pago:</span> {o.payment_method}
          </p>
          <p>
            <span className="text-[#8f7aab]">Entrega:</span>{" "}
            {o.delivery_type === "automatic" ? "Automática" : "Manual / coordinada"}
          </p>
          {o.contact && (
            <p>
              <span className="text-[#8f7aab]">Contacto:</span> {o.contact}
            </p>
          )}
          {o.delivered_at && (
            <p>
              <span className="text-[#8f7aab]">Entregado:</span> {formatDate(o.delivered_at)}
            </p>
          )}
        </div>

        {o.customer_notes && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-[#c9b8e6]">
            <p className="mb-1 font-bold text-white">Tus notas</p>
            <p className="whitespace-pre-line">{o.customer_notes}</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Productos</h2>
          <div className="mt-3 divide-y divide-white/5">
            {orderItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{item.product_name}</p>
                  <p className="text-xs text-[#8f7aab]">
                    {item.quantity} × {formatMoney(Number(item.unit_price), store.currency)} ·{" "}
                    {item.delivery_type === "automatic" ? "automática" : "manual"}
                  </p>
                  {item.delivery_data && (
                    <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
                      <p className="text-[0.65rem] font-bold uppercase text-emerald-200">
                        Datos de entrega
                      </p>
                      <p className="mt-1 whitespace-pre-line font-mono text-xs text-emerald-100">
                        {item.delivery_data}
                      </p>
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-sm font-black text-white">
                  {formatMoney(Number(item.subtotal), store.currency)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
            <div className="flex justify-between text-[#a291bd]">
              <span>Subtotal</span>
              <span>{formatMoney(Number(o.subtotal), store.currency)}</span>
            </div>
            {Number(o.discount) > 0 && (
              <div className="flex justify-between text-emerald-300">
                <span>Descuento</span>
                <span>-{formatMoney(Number(o.discount), store.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-white">
              <span>Total</span>
              <span>{formatMoney(Number(o.total), store.currency)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {needsProof && (
            <ProofUpload
              orderId={o.id}
              hasProof={Boolean(payment?.proof_url)}
              proofUrl={proofLink}
            />
          )}

          <div className="card p-4 text-xs text-[#a291bd]">
            <h2 className="text-sm font-black uppercase tracking-wide text-white">Estado del pedido</h2>
            <ol className="mt-3 space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-[#c77dff]">1.</span> Pedido creado
              </li>
              <li className="flex items-center gap-2">
                <span className={o.payment_status === "aprobado" ? "text-emerald-400" : "text-[#c77dff]"}>2.</span>
                Pago {o.payment_status === "aprobado" ? "verificado" : "en verificación"}
              </li>
              <li className="flex items-center gap-2">
                <span className={o.status === "en_proceso" || o.status === "entregado" ? "text-emerald-400" : "text-[#c77dff]"}>3.</span>
                Preparando entrega
              </li>
              <li className="flex items-center gap-2">
                <span className={o.status === "entregado" ? "text-emerald-400" : "text-[#c77dff]"}>4.</span>
                Entregado
              </li>
            </ol>
            {payment?.review_notes && (
              <p className="mt-3 rounded-lg border border-white/10 bg-black/30 p-2">
                Nota del administrador: {payment.review_notes}
              </p>
            )}
          </div>

          <Link href="/catalogo" className="btn btn-ghost w-full">
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
