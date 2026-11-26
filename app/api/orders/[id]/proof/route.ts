import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const admin = await createSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, order_number, status")
    .eq("id", id)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const reference = String(form.get("reference") ?? "").slice(0, 120);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo inválido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 8 MB." }, { status: 413 });
  }
  const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Formato no permitido (PNG, JPG, WEBP o PDF)." }, { status: 415 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `proofs/${user.id}/${order.order_number}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("multishop")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `No se pudo subir: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicUrl } = admin.storage.from("multishop").getPublicUrl(path);

  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("payments")
      .update({ proof_url: publicUrl.publicUrl, reference: reference || null, status: "en_revision" })
      .eq("id", existing.id);
  } else {
    await admin.from("payments").insert({
      order_id: order.id,
      user_id: user.id,
      amount: 0,
      method: "transferencia",
      status: "en_revision",
      proof_url: publicUrl.publicUrl,
      reference: reference || null,
    });
  }

  await admin
    .from("orders")
    .update({ payment_status: "en_revision" })
    .eq("id", order.id)
    .neq("payment_status", "aprobado");

  await admin.from("notifications").insert({
    user_id: user.id,
    title: `Comprobante recibido · ${order.order_number}`,
    body: "Estamos verificando tu pago. Te notificaremos cuando sea aprobado.",
    type: "pago",
    link: `/compras/${order.id}`,
  });

  return NextResponse.json({ ok: true, proofUrl: publicUrl.publicUrl });
}
