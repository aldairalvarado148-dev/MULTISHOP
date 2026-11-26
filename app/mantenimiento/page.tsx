import Link from "next/link";
import { getMaintenanceSettings, getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mantenimiento · MULTISHOP" };

export default async function MaintenancePage() {
  const [maintenance, store] = await Promise.all([getMaintenanceSettings(), getStoreSettings()]);

  const estimated = maintenance.estimated_date
    ? new Date(`${maintenance.estimated_date}T12:00:00`).toLocaleDateString("es", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-[#7b2cbf]/40 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#c77dff]/25 blur-[110px]" />
      <div className="card relative w-full max-w-lg p-6 text-center animate-fade-up">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.4em] text-[#c77dff]">
          {store.name}
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Estamos en mantenimiento
        </h1>
        <p className="mt-3 whitespace-pre-line text-sm text-[#c9b8e6]">{maintenance.message}</p>

        {maintenance.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={maintenance.image_url}
            alt="Mantenimiento"
            className="mx-auto mt-5 max-h-52 w-full rounded-2xl object-cover"
          />
        )}

        {estimated && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-[#a291bd]">
            Regreso estimado: <span className="font-bold text-white">{estimated}</span>
          </p>
        )}

        <p className="mt-5 text-[0.7rem] text-[#8f7aab]">
          Las compras están temporalmente deshabilitadas. El equipo administrativo puede seguir
          trabajando desde el panel.
        </p>

        <Link href="/admin" className="btn btn-primary mt-5 inline-flex w-full text-sm">
          Acceso administrador
        </Link>
      </div>
    </main>
  );
}
