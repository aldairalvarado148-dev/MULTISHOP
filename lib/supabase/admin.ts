import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

/**
 * Cliente administrativo con service role.
 * SOLO se importa en código de servidor (API routes / server components).
 * Nunca debe llegar al navegador.
 */
export function await createSupabaseAdminClient() {
  const env = supabaseEnv();
  if (!env?.serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.",
    );
  }
  return createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasDataAccess(): boolean {
  return Boolean(supabaseEnv()?.serviceKey);
}
