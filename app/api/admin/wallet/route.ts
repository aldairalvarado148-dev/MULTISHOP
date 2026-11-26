import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    type?: "credito" | "debito" | "ajuste";
    amount?: number;
    description?: string;
  };

  const userId = String(body.userId ?? "");
  const type = body.type ?? "credito";
  const amount = Number(body.amount);

  if (!userId) return NextResponse.json({ error: "Falta el cliente." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
  }

  const admin = await createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("balance, email").eq("id", userId).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

  const current = Number(profile.balance ?? 0);
  const next =
    type === "debito" ? Math.round((current - amount) * 100) / 100 : Math.round((current + amount) * 100) / 100;

  if (next < 0) {
    return NextResponse.json({ error: "El saldo no puede quedar negativo." }, { status: 400 });
  }

  const { error } = await admin.from("profiles").update({ balance: next }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("wallet_transactions").insert({
    user_id: userId,
    type,
    amount,
    balance_after: next,
    description: (body.description ?? "").slice(0, 200) || "Ajuste manual de administración",
    admin_id: session.userId,
  });

  await admin.from("notifications").insert({
    user_id: userId,
    title: type === "debito" ? "Saldo ajustado" : "Saldo acreditado",
    body: (body.description ?? "").slice(0, 200) || `Movimiento de ${amount.toFixed(2)} en tu saldo.`,
    type: "saldo",
    link: "/saldo",
  });

  await admin.from("admin_logs").insert({
    admin_id: session.userId,
    admin_email: session.email,
    action: "ajuste_saldo",
    entity: "profiles",
    entity_id: userId,
    details: { type, amount, balance_after: next },
  });

  return NextResponse.json({ ok: true, balance: next });
}
