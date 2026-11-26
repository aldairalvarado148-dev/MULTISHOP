import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import TopupForm from "@/components/wallet/TopupForm";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import type { WalletTransaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BalancePage() {
  const session = await getSession();
  const store = await getStoreSettings();

  if (!session.userId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          icon="💜"
          title="Inicia sesión para ver tu saldo"
          description="Tu saldo, recargas y movimientos quedan guardados en tu cuenta."
          actionLabel="Iniciar sesión"
          actionHref="/login?next=/saldo"
        />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: movements }, { data: topups }] = supabase
    ? await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", session.userId)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("wallet_topups")
          .select("id, amount, method, status, created_at")
          .eq("user_id", session.userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ])
    : [{ data: [] }, { data: [] }];

  const list = (movements as WalletTransaction[] | null) ?? [];
  const pending = (topups as Array<{ id: string; amount: number; status: string; created_at: string }> | null) ?? [];
  const balance = Number(session.profile?.balance ?? 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Mi saldo</h1>
      <p className="mt-1 text-sm text-[#a291bd]">Recarga y paga tus compras al instante.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="card relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#b026ff]/25 blur-3xl" />
            <p className="text-xs font-bold uppercase tracking-widest text-[#c77dff]">
              Saldo disponible
            </p>
            <p className="mt-2 text-4xl font-black text-white neon-text">
              {formatMoney(balance, store.currency)}
            </p>
            <p className="mt-2 text-xs text-[#8f7aab]">
              Úsalo para pagar tus pedidos sin verificación manual.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-black uppercase tracking-wide text-white">
              Historial de saldo
            </h2>
            {list.length === 0 ? (
              <p className="mt-3 text-xs text-[#8f7aab]">
                Aún no tienes movimientos. Tus recargas aprobadas y compras aparecerán aquí.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-white/5">
                {list.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{tx.description ?? tx.type}</p>
                      <p className="text-[0.7rem] text-[#8f7aab]">{formatDate(tx.created_at)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-black ${
                          tx.type === "debito" ? "text-rose-300" : "text-emerald-300"
                        }`}
                      >
                        {tx.type === "debito" ? "−" : "+"}
                        {formatMoney(Number(tx.amount), store.currency)}
                      </p>
                      <p className="text-[0.65rem] text-[#8f7aab]">
                        Saldo: {formatMoney(Number(tx.balance_after), store.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pending.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                Solicitudes de recarga
              </h2>
              <div className="mt-3 space-y-2">
                {pending.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-[#a291bd]">{formatDate(t.created_at)}</span>
                    <span className="text-white">{formatMoney(Number(t.amount), store.currency)}</span>
                    <span className="badge">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <TopupForm currency={store.currency} instructions={store.payment_instructions} />
          <Link href="/catalogo" className="btn btn-ghost w-full">
            Ir al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
