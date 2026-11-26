import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";
import { formatDate, formatMoney } from "@/lib/utils";
import { getStoreSettings } from "@/lib/settings";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasDataAccess() ? await createSupabaseAdminClient() : await createSupabaseServerClient();
  const store = await getStoreSettings();
  if (!supabase) {
    return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;
  }

  const [products, categories, clients, pendingOrders, revenue, recent, lowStock] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "cliente"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pendiente"),
    supabase.from("orders").select("total").eq("payment_status", "aprobado"),
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("products")
      .select("id, name, stock, is_active")
      .lte("stock", 3)
      .order("stock", { ascending: true })
      .limit(5),
  ]);

  const totalRevenue = ((revenue.data as Array<{ total: number }> | null) ?? []).reduce(
    (sum, row) => sum + Number(row.total),
    0,
  );
  const orders = (recent.data as Order[] | null) ?? [];
  const stock = (lowStock.data as Array<{ id: string; name: string; stock: number }> | null) ?? [];

  const cards = [
    { label: "Ventas verificadas", value: formatMoney(totalRevenue, store.currency), href: "/admin/pedidos" },
    { label: "Pedidos pendientes", value: String(pendingOrders.count ?? 0), href: "/admin/pedidos" },
    { label: "Productos", value: String(products.count ?? 0), href: "/admin/productos" },
    { label: "Categorías", value: String(categories.count ?? 0), href: "/admin/categorias" },
    { label: "Clientes", value: String(clients.count ?? 0), href: "/admin/clientes" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-xs text-[#a291bd]">
            Hola {session.profile?.full_name ?? session.email}. Resumen de tu tienda.
          </p>
        </div>
        <Link href="/admin/productos" className="btn btn-primary text-xs">
          + Nuevo producto
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card p-4 transition hover:border-[#b026ff]/50"
          >
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#8f7aab]">
              {card.label}
            </p>
            <p className="mt-1 truncate text-lg font-black text-white">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide text-white">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="text-xs text-[#c77dff] hover:underline">
              Ver todos →
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="mt-3 text-xs text-[#8f7aab]">Todavía no hay pedidos.</p>
          ) : (
            <div className="mt-3 divide-y divide-white/5">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/pedidos?focus=${order.id}`}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-[#c77dff]">{order.order_number}</p>
                    <p className="text-[0.7rem] text-[#8f7aab]">
                      {order.customer_email ?? "cliente"} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-white">
                      {formatMoney(Number(order.total), store.currency)}
                    </p>
                    <p className="text-[0.65rem] text-[#8f7aab]">{order.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-white">Stock bajo</h2>
            {stock.length === 0 ? (
              <p className="mt-2 text-xs text-[#8f7aab]">Todo con stock suficiente.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {stock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-[#c9b8e6]">{p.name}</span>
                    <span className={p.stock <= 0 ? "text-rose-300" : "text-amber-300"}>{p.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-white">Accesos rápidos</h2>
            <div className="mt-2 grid gap-1.5 text-xs">
              <Link href="/admin/mantenimiento" className="text-[#c77dff] hover:underline">
                🛠️ Modo mantenimiento
              </Link>
              <Link href="/admin/backups" className="text-[#c77dff] hover:underline">
                💾 Copias de seguridad
              </Link>
              <Link href="/admin/configuracion" className="text-[#c77dff] hover:underline">
                ⚙️ Configuración de la tienda
              </Link>
              <Link href="/admin/actividad" className="text-[#c77dff] hover:underline">
                📜 Registro de actividad
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
