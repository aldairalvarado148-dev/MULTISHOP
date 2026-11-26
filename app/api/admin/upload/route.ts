import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";
import { MEDIA_BUCKET } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!hasDataAccess()) {
    return NextResponse.json({ error: "La tienda aún no está configurada en Supabase." }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "productos").replace(/[^a-z0-9/_-]/gi, "");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen supera 6 MB." }, { status: 413 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Formato no permitido (PNG, JPG, WEBP, GIF, AVIF)." }, { status: 415 });
  }

  const admin = await createSupabaseAdminClient();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl, path });
}
