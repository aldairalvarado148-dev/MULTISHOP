"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente de navegador: solo anon key, nunca service role. */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase no está configurado (faltan variables públicas).");
  }
  return createBrowserClient(url, anonKey);
}
