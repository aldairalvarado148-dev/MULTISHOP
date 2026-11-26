import BalanceManager, { type BalanceRow } from "@/components/admin/BalanceManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDataAccess } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminBalancePage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasDataAccess() ? await createSupabaseAdminClient() : await createSupabaseServerClient();
  const store = await getStoreSettings();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  const profiles = (data as Profile[] | null) ?? [];

  const rows: BalanceRow[] = profiles.map((p) => ({
    id: p.id,
    name: p.full_name ?? "Cliente",
    email: p.email ?? "—",
    balance: Number(p.balance ?? 0),
    is_blocked: p.is_blocked,
  }));

  return (
    <div>
      <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Saldos de clientes</h1>
      <p className="mt-1 text-xs text-[#a291bd]">
        Acredita o debita saldo manualmente. Cada movimiento queda registrado en el historial del cliente.
      </p>
      <div className="mt-4">
        <BalanceManager rows={rows} currency={store.currency} />
      </div>
    </div>
  );
}
