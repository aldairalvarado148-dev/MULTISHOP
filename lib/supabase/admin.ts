import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Cliente de datos del servidor.
 *
 * Usa la sesión del usuario autenticado (cookies) y las políticas RLS de
 * Supabase, por lo que NO requiere ninguna clave privada ni service role.
 * Los permisos de administrador se resuelven en la base de datos con
 * public.is_admin().
 *
 * SOLO se importa en código de servidor (API routes / server components).
 */
export async function createSupabaseAdminClient() {
  const client = await createSupabaseServerClient();
  if (!client) {
    throw new Error("Supabase no está configurado en el servidor.");
  }
  return client;
}

export function hasDataAccess(): boolean {
  return isSupabaseConfigured();
}
