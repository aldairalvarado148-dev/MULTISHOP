import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente de pago",
  pagado: "Pagado",
  en_proceso: "En proceso",
  entregado: "Entregado",
  cancelado: "Cancelado",
  rechazado: "Rechazado",
};

export default async function MyOrdersPage() {
  const session = await getSession();
  const store = await getStoreSettings();

  if (!session.userId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          icon="📦"
          title="Inicia sesión para ver tus compras"
          description="Tu historial de pedidos queda guardado en tu cuenta."
          actionLabel="Iniciar sesión"
          actionHref="/login?next=/compras"
        />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = supabase
    ? await supabase
        .from("orders")
        .select("*")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const orders = (data as Order[] | null) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Mis compras</h1>
          <p className="mt-1 text-sm text-[#a291bd]">
            {orders.length} pedido{orders.length === 1 ? "" : "s"} registrado{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/catalogo" className="btn btn-ghost">
          Seguir comprando
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🧾"
            title="Todavía no tienes pedidos"
            description="Cuando compres en MULTISHOP, tus pedidos aparecerán aquí con su estado y comprobantes."
            actionLabel="Ver catálogo"
            actionHref="/catalogo"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/compras/${order.id}`}
              className="card flex flex-wrap items-center gap-4 p-4 transition hover:border-[#b026ff]/45"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-[#c77dff]">{order.order_number}</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {formatMoney(Number(order.total), store.currency)}
                </p>
                <p className="mt-0.5 text-xs text-[#8f7aab]">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge badge-${order.status}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
                <span className="badge">{order.payment_method}</span>
                <span className="text-xs text-[#c77dff]">Ver detalle →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
