import type { Profile } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionContext = {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  isAdmin: boolean;
};

export const EMPTY_SESSION: SessionContext = {
  userId: null,
  email: null,
  profile: null,
  isAdmin: false,
};

/** Devuelve el usuario autenticado y su perfil (o contexto vacío). */
export async function getSession(): Promise<SessionContext> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return EMPTY_SESSION;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_SESSION;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const typed = (profile as Profile | null) ?? null;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: typed,
    isAdmin: typed?.role === "admin" && !typed?.is_blocked,
  };
}

/** Exige administrador; devuelve null si no lo es. */
export async function requireAdmin(): Promise<SessionContext | null> {
  const session = await getSession();
  if (!session.userId || !session.isAdmin) return null;
  return session;
}
