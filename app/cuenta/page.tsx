import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/account/LogoutButton";
import ProfileForm from "@/components/account/ProfileForm";
import MarkNotificationsRead from "@/components/account/MarkNotificationsRead";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";
import { getStoreSettings } from "@/lib/settings";
import type { Notification } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login?next=/cuenta");

  const store = await getStoreSettings();
  const supabase = await createSupabaseServerClient();
  const { data } = supabase
    ? await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const notifications = (data as Notification[] | null) ?? [];
  const unread = notifications.filter((n) => !n.is_read).length;
  const profile = session.profile;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Mi cuenta</h1>
          <p className="mt-1 text-sm text-[#a291bd]">{session.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {session.isAdmin && (
            <Link href="/admin" className="btn btn-primary text-xs">
              Panel administrador
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ProfileForm
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? ""}
          email={session.email ?? ""}
        />

        <div className="card p-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Resumen</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Link href="/compras" className="rounded-xl border border-[#b026ff]/20 bg-black/30 p-3 transition hover:border-[#b026ff]/50">
              <p className="text-[0.65rem] uppercase tracking-wide text-[#8f7aab]">Mis compras</p>
              <p className="mt-1 font-bold text-white">Historial →</p>
            </Link>
            <Link href="/saldo" className="rounded-xl border border-[#b026ff]/20 bg-black/30 p-3 transition hover:border-[#b026ff]/50">
              <p className="text-[0.65rem] uppercase tracking-wide text-[#8f7aab]">Saldo</p>
              <p className="mt-1 font-bold text-white">
                {formatMoney(Number(profile?.balance ?? 0), store.currency)}
              </p>
            </Link>
            <Link href="/carrito" className="rounded-xl border border-[#b026ff]/20 bg-black/30 p-3 transition hover:border-[#b026ff]/50">
              <p className="text-[0.65rem] uppercase tracking-wide text-[#8f7aab]">Carrito</p>
              <p className="mt-1 font-bold text-white">Ver carrito →</p>
            </Link>
            <Link href="/cuenta/restablecer" className="rounded-xl border border-[#b026ff]/20 bg-black/30 p-3 transition hover:border-[#b026ff]/50">
              <p className="text-[0.65rem] uppercase tracking-wide text-[#8f7aab]">Seguridad</p>
              <p className="mt-1 font-bold text-white">Cambiar clave →</p>
            </Link>
          </div>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-white">
            Notificaciones {unread > 0 && <span className="ml-1 text-[#c77dff]">({unread})</span>}
          </h2>
          {unread > 0 && <MarkNotificationsRead />}
        </div>

        {notifications.length === 0 ? (
          <p className="mt-3 text-xs text-[#8f7aab]">No tienes notificaciones todavía.</p>
        ) : (
          <div className="mt-3 divide-y divide-white/5">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className={`text-sm ${n.is_read ? "text-[#c9b8e6]" : "font-bold text-white"}`}>
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 text-xs text-[#8f7aab]">{n.body}</p>}
                  <p className="mt-0.5 text-[0.65rem] text-[#6f5c8a]">{formatDate(n.created_at)}</p>
                </div>
                {n.link && (
                  <Link href={n.link} className="shrink-0 text-xs text-[#c77dff] hover:underline">
                    Ver →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
