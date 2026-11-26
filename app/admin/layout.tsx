import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/productos", label: "Productos", icon: "🎮" },
  { href: "/admin/categorias", label: "Categorías", icon: "🗂️" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "🧾" },
  { href: "/admin/pagos", label: "Pagos y recargas", icon: "💳" },
  { href: "/admin/saldos", label: "Saldos", icon: "💰" },
  { href: "/admin/clientes", label: "Clientes", icon: "👤" },
  { href: "/admin/banners", label: "Banners", icon: "🖼️" },
  { href: "/admin/soporte", label: "Soporte", icon: "💬" },
  { href: "/admin/configuracion", label: "Configuración", icon: "⚙️" },
  { href: "/admin/mantenimiento", label: "Mantenimiento", icon: "🛠️" },
  { href: "/admin/backups", label: "Copias de seguridad", icon: "💾" },
  { href: "/admin/actividad", label: "Actividad", icon: "📜" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session.userId) redirect("/login?next=/admin");

  if (!session.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="mt-4 text-xl font-black text-white">Acceso restringido</h1>
        <p className="mt-2 text-sm text-[#a291bd]">
          Esta sección es solo para administradores de MULTISHOP.
        </p>
        <Link href="/" className="btn btn-primary mt-5">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 lg:flex-row lg:px-4 lg:py-6">
      <aside className="lg:w-60 lg:shrink-0">
        <div className="card p-3">
          <div className="flex items-center justify-between gap-2 px-1 pb-3 lg:block">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#c77dff]">Admin</p>
              <p className="text-sm font-bold text-white">MULTISHOP</p>
            </div>
            <Link href="/" className="text-[0.65rem] text-[#c77dff] hover:underline lg:mt-2 lg:block">
              ← Ver tienda
            </Link>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#c9b8e6] transition hover:bg-[#b026ff]/15 hover:text-white"
              >
                <span aria-hidden>{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
