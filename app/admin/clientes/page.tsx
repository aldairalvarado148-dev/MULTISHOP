import CustomersManager, { type CustomerRow } from "@/components/admin/CustomersManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasServiceRole() ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const store = await getStoreSettings();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const [{ data: profiles }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("user_id"),
  ]);

  const list = (profiles as Profile[] | null) ?? [];
  const orderCount = new Map<string, number>();
  for (const order of (orders as Array<{ user_id: string | null }> | null) ?? []) {
    if (!order.user_id) continue;
    orderCount.set(order.user_id, (orderCount.get(order.user_id) ?? 0) + 1);
  }

  const rows: CustomerRow[] = list.map((p) => ({
    id: p.id,
    name: p.full_name ?? "Cliente",
    email: p.email ?? "—",
    role: p.role,
    balance: Number(p.balance ?? 0),
    is_blocked: p.is_blocked,
    orders: orderCount.get(p.id) ?? 0,
    created_at: p.created_at,
  }));

  return (
    <div>
      <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Clientes</h1>
      <p className="mt-1 text-xs text-[#a291bd]">
        Administra roles y accesos. Los administradores acceden al panel; los bloqueados no pueden comprar.
      </p>
      <div className="mt-4">
        <CustomersManager rows={rows} currency={store.currency} />
      </div>
    </div>
  );
}
