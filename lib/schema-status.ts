import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Comprueba si el esquema de MULTISHOP ya fue aplicado en el proyecto Supabase.
 * Devuelve false solo cuando la tabla principal no existe (PGRST205 / 42P01),
 * para no mostrar avisos falsos ante errores de red o permisos.
 */
export async function isSchemaReady(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  const { error } = await supabase.from("categories").select("id").limit(1);
  if (!error) return true;

  return error.code !== "PGRST205" && error.code !== "42P01";
}
