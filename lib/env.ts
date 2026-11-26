export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * MULTISHOP admite dos convenciones de nombres para las credenciales públicas:
 *  - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (convención Next.js)
 *  - SUPABASE_URL / SUPABASE_ANON_KEY (nombres usados en Settings)
 *
 * La aplicación NO necesita ninguna clave privada: todas las escrituras se
 * hacen con la sesión del usuario y las políticas RLS de Supabase.
 */
export const URL_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const;
export const ANON_KEYS = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"] as const;

function pick(keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

/** Lee la configuración de Supabase desde el entorno del servidor. */
export function supabaseEnv(): SupabaseEnv | null {
  const url = pick(URL_KEYS);
  const anonKey = pick(ANON_KEYS);
  if (!url || !anonKey) return null;
  if (!/^https?:\/\//.test(url)) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return supabaseEnv() !== null;
}

/**
 * Indica si el servidor puede operar la tienda (lecturas y escrituras).
 * Se cumple cuando Supabase está configurado; los permisos reales los
 * resuelve RLS con el rol del usuario autenticado.
 */
export function hasDataAccess(): boolean {
  return isSupabaseConfigured();
}

/** Variables que faltan para conectar la tienda con Supabase. */
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!pick(URL_KEYS)) missing.push("SUPABASE_URL");
  if (!pick(ANON_KEYS)) missing.push("SUPABASE_ANON_KEY");
  return missing;
}
