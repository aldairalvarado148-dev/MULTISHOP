import SettingsForm, { type SettingsField } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/auth";
import { getMaintenanceSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const FIELDS: SettingsField[] = [
  {
    name: "message",
    label: "Mensaje personalizado",
    type: "textarea",
    placeholder: "Estamos mejorando la tienda…",
  },
  {
    name: "image_url",
    label: "Imagen opcional (URL)",
    type: "text",
    placeholder: "https://…",
    help: "Pega la URL pública de una imagen en Supabase Storage.",
  },
  {
    name: "estimated_date",
    label: "Fecha estimada de regreso",
    type: "date",
    help: "Se muestra al cliente como referencia.",
  },
];

export default async function AdminMaintenancePage() {
  const session = await requireAdmin();
  if (!session) return null;
  const maintenance = await getMaintenanceSettings();

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Modo mantenimiento</h1>
      <p className="mt-1 text-xs text-[#a291bd]">
        Al activarlo, los clientes ven una pantalla de mantenimiento y el servidor rechaza nuevos pedidos y
        recargas. El panel admin sigue accesible.
      </p>
      <div className="mt-4">
        <SettingsForm
          settingKey="maintenance"
          initial={maintenance as unknown as Record<string, unknown>}
          fields={FIELDS}
          submitLabel="Guardar mantenimiento"
          dangerToggle={{ name: "enabled", onLabel: "Mantenimiento ACTIVADO", offLabel: "Mantenimiento desactivado" }}
        />
      </div>
    </div>
  );
}
