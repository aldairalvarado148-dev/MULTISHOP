import PaymentsManager, { type PaymentRow, type TopupRow } from "@/components/admin/PaymentsManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type RawPayment = {
  id: string;
  order_id: string;
  user_id: string | null;
  amount: number;
  method: string;
  reference: string | null;
  proof_url: string | null;
  status: string;
  created_at: string;
};

type RawTopup = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  reference: string | null;
  proof_url: string | null;
  status: string;
  created_at: string;
};

export default async function AdminPaymentsPage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasServiceRole() ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const store = await getStoreSettings();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const [{ data: payments }, { data: orders }, { data: topups }, { data: profiles }] = await Promise.all([
    supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("orders").select("id, order_number, customer_name, customer_email"),
    supabase.from("wallet_topups").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, email, full_name"),
  ]);

  const orderMap = new Map(
    ((orders as Array<{ id: string; order_number: string; customer_name: string | null; customer_email: string | null }> | null) ?? []).map(
      (o) => [o.id, o],
    ),
  );
  const profileMap = new Map(
    ((profiles as Array<{ id: string; email: string | null; full_name: string | null }> | null) ?? []).map((p) => [
      p.id,
      p,
    ]),
  );

  const paymentRows: PaymentRow[] = ((payments as RawPayment[] | null) ?? []).map((p) => {
    const order = orderMap.get(p.order_id);
    const profile = p.user_id ? profileMap.get(p.user_id) : null;
    return {
      id: p.id,
      order_id: p.order_id,
      order_number: order?.order_number ?? null,
      customer: order?.customer_name ?? order?.customer_email ?? profile?.full_name ?? profile?.email ?? null,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      proof_url: p.proof_url,
      status: p.status,
      created_at: p.created_at,
    };
  });

  const topupRows: TopupRow[] = ((topups as RawTopup[] | null) ?? []).map((t) => {
    const profile = profileMap.get(t.user_id);
    return {
      id: t.id,
      user_id: t.user_id,
      customer: profile?.full_name ?? profile?.email ?? null,
      amount: Number(t.amount),
      method: t.method,
      reference: t.reference,
      proof_url: t.proof_url,
      status: t.status,
      created_at: t.created_at,
    };
  });

  return (
    <div>
      <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Pagos y recargas</h1>
      <p className="mt-1 text-xs text-[#a291bd]">
        Comprueba cada comprobante antes de aprobar. Nunca se confirma un pedido sin verificación.
      </p>
      <div className="mt-4">
        <PaymentsManager payments={paymentRows} topups={topupRows} currency={store.currency} />
      </div>
    </div>
  );
}
