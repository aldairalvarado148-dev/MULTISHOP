import Link from "next/link";
import type { Category } from "@/lib/types";

export default function Footer({
  categories,
  storeName,
}: {
  categories: Category[];
  storeName: string;
}) {
  return (
    <footer className="mt-16 border-t border-[rgba(176,38,255,0.18)] bg-[rgba(6,3,12,0.7)] pb-20 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="neon-text text-xl font-black tracking-[0.18em]">
            {storeName || "MULTISHOP"}
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#a291bd]">
            Tienda digital premium de recargas, suscripciones y cuentas. Entrega rápida,
            soporte real y pagos verificados.
          </p>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#c9b6e6]">
            Categorías
          </p>
          <ul className="space-y-2 text-sm text-[#a291bd]">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link className="transition hover:text-[#c77dff]" href={`/categoria/${cat.slug}`}>
                  {cat.name}
                </Link>
              </li>
            ))}
            {categories.length === 0 && <li className="text-[#7a6b93]">Sin categorías aún</li>}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#c9b6e6]">
            Mi cuenta
          </p>
          <ul className="space-y-2 text-sm text-[#a291bd]">
            <li>
              <Link className="transition hover:text-[#c77dff]" href="/compras">
                Mis compras
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[#c77dff]" href="/saldo">
                Mi saldo
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[#c77dff]" href="/carrito">
                Carrito
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[#c77dff]" href="/soporte">
                Soporte
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#c9b6e6]">
            Compra segura
          </p>
          <ul className="space-y-2 text-sm text-[#a291bd]">
            <li>Pagos verificados manualmente</li>
            <li>Pedidos sin duplicados</li>
            <li>Datos protegidos con RLS</li>
            <li>Historial persistente</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 px-4 py-5 text-center text-xs text-[#7a6b93]">
        © {new Date().getFullYear()} {storeName || "MULTISHOP"}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
