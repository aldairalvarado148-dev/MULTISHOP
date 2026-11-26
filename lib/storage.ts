import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Imágenes de productos, banners y categorías (bucket público). */
export const MEDIA_BUCKET = "media";
/** Comprobantes de pago y recargas (bucket privado: solo su dueño o un admin). */
export const PROOF_BUCKET = "comprobantes";

const SIGNED_TTL_SECONDS = 60 * 60;

/**
 * En `proof_url` se guarda la ruta del objeto dentro del bucket privado.
 * Aquí se convierte en un enlace firmado temporal para poder abrirlo desde el
 * panel o desde "Mis compras". Los valores antiguos que ya eran una URL
 * completa se devuelven tal cual.
 */
export async function resolveProofLink(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(value, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
