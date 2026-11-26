import OrdersManager from "@/components/admin/OrdersManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDataAccess } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";
import type { Order, OrderItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const session = await requireAdmin();
  if (!session) return null;
  const { focus } = await searchParams;

  const supabase = hasDataAccess() ? await createSupabaseAdminClient() : await createSupabaseServerClient();
  const store = await getStoreSettings();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const [{ data: orders }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("order_items").select("*"),
  ]);

  const list = (orders as Order[] | null) ?? [];
  const allItems = (items as OrderItem[] | null) ?? [];

  const grouped = list.map((order) => ({
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    items: allItems
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        ...item,
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      })),
  }));

  return (
    <div>
      <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Pedidos</h1>
      <p className="mt-1 text-xs text-[#a291bd]">
        Verifica pagos, entrega los productos y actualiza los estados. El cliente ve el cambio al instante.
      </p>
      <div className="mt-4">
        <OrdersManager orders={grouped} currency={store.currency} focusId={focus} />
      </div>
    </div>
  );
}
