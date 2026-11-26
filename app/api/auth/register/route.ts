import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = body.fullName?.trim() ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: body.phone?.trim() ?? "" },
    },
  });

  if (error) {
    const message = error.message.includes("already registered")
      ? "Ya existe una cuenta con este correo."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // El primer usuario registrado se convierte en administrador (arranque seguro).
  if (data.user && hasDataAccess()) {
    try {
      const admin = await createSupabaseAdminClient();
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (!count) {
        await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
        await admin.from("admin_logs").insert({
          admin_id: data.user.id,
          admin_email: email,
          action: "admin_bootstrap",
          entity: "profiles",
          entity_id: data.user.id,
          details: { reason: "Primer usuario registrado" },
        });
      } else {
        await admin.from("profiles").upsert(
          {
            id: data.user.id,
            email,
            full_name: fullName || email.split("@")[0],
            phone: body.phone?.trim() ?? "",
          },
          { onConflict: "id" },
        );
      }
    } catch {
      // El perfil se crea igualmente por el trigger de la base de datos.
    }
  }

  const needsConfirmation = !data.session;
  return NextResponse.json({ ok: true, needsConfirmation });
}
