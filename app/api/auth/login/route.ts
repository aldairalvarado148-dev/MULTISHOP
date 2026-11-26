import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });

  if (error) {
    const message =
      error.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos."
        : error.message === "Email not confirmed"
          ? "Debes confirmar tu correo antes de ingresar."
          : error.message;
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_blocked, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Tu cuenta está bloqueada. Contacta al soporte." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    role: profile?.role ?? "cliente",
  });
}
