import SupportManager, { type TicketRow } from "@/components/admin/SupportManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDataAccess } from "@/lib/env";
import type { SupportTicket } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasDataAccess() ? await createSupabaseAdminClient() : await createSupabaseServerClient();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const [{ data: tickets }, { data: profiles }, { data: orders }] = await Promise.all([
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, email, full_name"),
    supabase.from("orders").select("id, order_number"),
  ]);

  const profileMap = new Map(
    ((profiles as Array<{ id: string; email: string | null; full_name: string | null }> | null) ?? []).map((p) => [
      p.id,
      p.full_name ?? p.email ?? "Cliente",
    ]),
  );
  const orderMap = new Map(
    ((orders as Array<{ id: string; order_number: string }> | null) ?? []).map((o) => [o.id, o.order_number]),
  );

  const rows: TicketRow[] = ((tickets as SupportTicket[] | null) ?? []).map((t) => ({
    id: t.id,
    subject: t.subject,
    message: t.message,
    status: t.status,
    admin_reply: t.admin_reply,
    created_at: t.created_at,
    customer: t.user_id ? profileMap.get(t.user_id) ?? "Cliente" : "Visitante",
    order_number: t.order_id ? orderMap.get(t.order_id) ?? null : null,
  }));

  return (
    <div>
      <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Soporte</h1>
      <p className="mt-1 text-xs text-[#a291bd]">
        Responde las consultas de tus clientes. La respuesta aparece en su cuenta como notificación.
      </p>
      <div className="mt-4">
        <SupportManager rows={rows} />
      </div>
    </div>
  );
}
