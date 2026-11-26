import type { MaintenanceSettings, StoreSettings } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEFAULT_STORE: StoreSettings = {
  name: "MULTISHOP",
  tagline: "Tienda digital premium",
  currency: "USD",
  whatsapp: "",
  support_email: "",
  payment_instructions:
    "Realiza el pago y envía el comprobante desde el detalle de tu pedido.",
};

export const DEFAULT_MAINTENANCE: MaintenanceSettings = {
  enabled: false,
  message: "Estamos realizando mejoras para brindarte una mejor experiencia.",
  image_url: "",
  estimated_date: "",
};

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fallback;
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (!data?.value) return fallback;
    return { ...fallback, ...(data.value as object) } as T;
  } catch {
    return fallback;
  }
}

export function getStoreSettings(): Promise<StoreSettings> {
  return readSetting<StoreSettings>("store", DEFAULT_STORE);
}

export function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  return readSetting<MaintenanceSettings>("maintenance", DEFAULT_MAINTENANCE);
}
