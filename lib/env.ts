export type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceKey: string | null;
};

/**
 * MULTISHOP admite dos convenciones de nombres para las credenciales:
 *  - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (convención Next.js)
 *  - SUPABASE_URL / SUPABASE_ANON_KEY (nombres usados en Settings)
 */
export const URL_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const;
export const ANON_KEYS = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"] as const;
export const SERVICE_KEYS = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"] as const;

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
  return {
    url,
    anonKey,
    serviceKey: pick(SERVICE_KEYS),
  };
}

export function isSupabaseConfigured(): boolean {
  return supabaseEnv() !== null;
}

export function hasServiceRole(): boolean {
  return Boolean(supabaseEnv()?.serviceKey);
}

/** Variables que faltan para operar la tienda completa. */
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!pick(URL_KEYS)) missing.push("SUPABASE_URL");
  if (!pick(ANON_KEYS)) missing.push("SUPABASE_ANON_KEY");
  if (!pick(SERVICE_KEYS)) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}
