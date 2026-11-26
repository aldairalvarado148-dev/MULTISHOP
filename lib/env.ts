export type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceKey: string | null;
};

/** Lee la configuración de Supabase desde el entorno del servidor. */
export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  if (!/^https?:\/\//.test(url)) return null;
  return {
    url,
    anonKey,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}
