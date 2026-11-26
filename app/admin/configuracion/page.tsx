import SettingsForm, { type SettingsField } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const FIELDS: SettingsField[] = [
  { name: "name", label: "Nombre de la tienda", type: "text", placeholder: "MULTISHOP" },
  { name: "tagline", label: "Eslogan", type: "text", placeholder: "Tienda digital premium" },
  { name: "currency", label: "Moneda", type: "text", placeholder: "USD", help: "Código de 3 letras (USD, MXN, COP…)." },
  { name: "whatsapp", label: "WhatsApp de soporte", type: "text", placeholder: "+51 999 999 999" },
  { name: "support_email", label: "Correo de soporte", type: "text", placeholder: "soporte@multishop.com" },
  {
    name: "payment_instructions",
    label: "Instrucciones de pago",
    type: "textarea",
    help: "Se muestran al cliente al confirmar el pedido y en el detalle de compra.",
  },
];

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  if (!session) return null;
  const store = await getStoreSettings();

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Configuración</h1>
      <p className="mt-1 text-xs text-[#a291bd]">
        Datos de la tienda guardados en Supabase. Se aplican de inmediato en todo el sitio.
      </p>
      <div className="mt-4">
        <SettingsForm
          settingKey="store"
          initial={store as unknown as Record<string, unknown>}
          fields={FIELDS}
        />
      </div>
    </div>
  );
}
