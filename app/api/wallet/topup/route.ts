import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";
import { getMaintenanceSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "La tienda aún no está configurada en Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  // Bloqueo de recargas en modo mantenimiento (validado en el servidor).
  const maintenance = await getMaintenanceSettings();
  if (maintenance.enabled) {
    return NextResponse.json(
      { error: "La tienda está en mantenimiento. No se pueden solicitar recargas ahora." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const amount = Number(String(form.get("amount") ?? "").replace(",", "."));
  const reference = String(form.get("reference") ?? "").slice(0, 120);
  const file = form.get("file");

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
  }

  const admin = await createSupabaseAdminClient();
  let proofUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera 8 MB." }, { status: 413 });
    }
    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido (PNG, JPG, WEBP o PDF)." }, { status: 415 });
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `topups/${user.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("multishop")
      .upload(path, buffer, { contentType: file.type, upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: `No se pudo subir: ${uploadError.message}` }, { status: 500 });
    }
    proofUrl = admin.storage.from("multishop").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await admin.from("wallet_topups").insert({
    user_id: user.id,
    amount: Math.round(amount * 100) / 100,
    method: "transferencia",
    reference: reference || null,
    proof_url: proofUrl,
    status: "pendiente",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("notifications").insert({
    user_id: user.id,
    title: "Solicitud de recarga recibida",
    body: "Verificaremos tu pago y acreditaremos el saldo en tu cuenta.",
    type: "saldo",
    link: "/saldo",
  });

  return NextResponse.json({ ok: true });
}
