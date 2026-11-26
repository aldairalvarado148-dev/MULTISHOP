import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDataAccess } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import type { AdminLog } from "@/lib/types";

export const dynamic = "force-dynamic";

type BackupEvent = {
  id: string;
  backup_name: string | null;
  action: string;
  status: string;
  message: string | null;
  actor_email: string | null;
  created_at: string;
};

export default async function AdminActivityPage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasDataAccess() ? await createSupabaseAdminClient() : await createSupabaseServerClient();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const [{ data: logs }, { data: events }] = await Promise.all([
    supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(80),
    supabase.from("backup_events").select("*").order("created_at", { ascending: false }).limit(40),
  ]);

  const logList = (logs as AdminLog[] | null) ?? [];
  const eventList = (events as BackupEvent[] | null) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Registro de actividades</h1>
        <p className="mt-1 text-xs text-[#a291bd]">Historial de operaciones administrativas y de copias de seguridad.</p>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="border-b border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#c77dff]">
          Actividad administrativa
        </h2>
        <table className="w-full min-w-[560px] text-left text-xs">
          <tbody className="divide-y divide-white/5">
            {logList.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-[#8f7aab]">Aún no hay actividad registrada.</td>
              </tr>
            )}
            {logList.map((log) => (
              <tr key={log.id} className="text-[#c9b8e6]">
                <td className="px-3 py-2 whitespace-nowrap text-[0.7rem] text-[#8f7aab]">
                  {formatDate(log.created_at)}
                </td>
                <td className="px-3 py-2">
                  <p className="font-bold text-white">{log.action}</p>
                  <p className="text-[0.7rem] text-[#8f7aab]">
                    {log.entity ?? "—"} {log.entity_id ? `· ${log.entity_id}` : ""}
                  </p>
                </td>
                <td className="px-3 py-2 text-[0.7rem]">{log.admin_email ?? "sistema"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="border-b border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#c77dff]">
          Historial de copias de seguridad
        </h2>
        <table className="w-full min-w-[560px] text-left text-xs">
          <tbody className="divide-y divide-white/5">
            {eventList.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-[#8f7aab]">Sin eventos de copias todavía.</td>
              </tr>
            )}
            {eventList.map((event) => (
              <tr key={event.id} className="text-[#c9b8e6]">
                <td className="px-3 py-2 whitespace-nowrap text-[0.7rem] text-[#8f7aab]">
                  {formatDate(event.created_at)}
                </td>
                <td className="px-3 py-2">
                  <p className="font-bold text-white">{event.action}</p>
                  <p className="text-[0.7rem] text-[#8f7aab]">{event.backup_name ?? "—"}</p>
                </td>
                <td className="px-3 py-2">
                  <span className={event.status === "ok" ? "text-emerald-300" : "text-rose-300"}>{event.status}</span>
                  {event.message && <p className="text-[0.7rem] text-[#8f7aab]">{event.message}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
