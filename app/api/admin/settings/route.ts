import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";
import { DEFAULT_MAINTENANCE, DEFAULT_STORE } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "La tienda aún no está configurada en Supabase." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    key?: string;
    value?: Record<string, unknown>;
  };

  if (body.key !== "store" && body.key !== "maintenance") {
    return NextResponse.json({ error: "Configuración desconocida." }, { status: 400 });
  }
  if (!body.value || typeof body.value !== "object") {
    return NextResponse.json({ error: "Valores inválidos." }, { status: 400 });
  }

  const defaults = body.key === "store" ? DEFAULT_STORE : DEFAULT_MAINTENANCE;
  const merged = { ...defaults, ...body.value };

  const admin = await createSupabaseAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert({ key: body.key, value: merged, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("admin_logs").insert({
    admin_id: session.userId,
    admin_email: session.email,
    action: `actualizar_configuracion_${body.key}`,
    entity: "settings",
    entity_id: body.key,
    details: merged,
  });

  return NextResponse.json({ ok: true, value: merged });
}
