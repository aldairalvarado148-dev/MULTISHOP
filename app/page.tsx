import Link from "next/link";
import BannerCarousel from "@/components/BannerCarousel";
import ProductCard from "@/components/ProductCard";
import SetupNotice from "@/components/SetupNotice";
import {
  getActiveCategories,
  getFeaturedProducts,
  getHomeBanners,
  getNewProducts,
  getOfferProducts,
} from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const BENEFITS = [
  "⚡ Entrega inmediata en productos automáticos",
  "🔒 Pagos verificados uno por uno",
  "🎮 Free Fire · 💜 Streaming",
  "💳 Saldo disponible para tus compras",
  "🛡️ Datos protegidos con RLS",
  "🎁 Ofertas y novedades cada semana",
];

export default async function HomePage() {
  const [store, categories, banners, featured, offers, novedades] = await Promise.all([
    getStoreSettings(),
    getActiveCategories(),
    getHomeBanners(),
    getFeaturedProducts(8),
    getOfferProducts(8),
    getNewProducts(8),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const hasProducts = featured.length + offers.length + novedades.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4">
      <SetupNotice />

      {/* HERO */}
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-[rgba(176,38,255,0.22)] bg-[radial-gradient(1000px_500px_at_15%_-10%,rgba(176,38,255,0.35),rgba(8,4,16,0.98))] px-5 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#7c3aed]/30 blur-3xl animate-pulse-glow" />
        <div className="relative max-w-2xl">
          <span className="badge">Tienda digital premium</span>
          <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
            Recargas, cuentas y <span className="neon-text">suscripciones</span> al instante
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#c4b3e0] sm:text-base">
            {store.tagline}. Diamantes de Free Fire, Netflix, YouTube Premium, Spotify y más, con
            entrega verificada y soporte real.
          </p>

          <form action="/catalogo" className="mt-6 flex max-w-md gap-2">
            <input
              name="q"
              className="input"
              placeholder="¿Qué estás buscando?"
              aria-label="Buscar en el catálogo"
            />
            <button type="submit" className="btn btn-primary shrink-0">
              Buscar
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/catalogo" className="btn btn-ghost">
              Ver catálogo
            </Link>
            <Link href="/catalogo?ofertas=1" className="btn btn-ghost">
              🔥 Ofertas
            </Link>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {BENEFITS.map((b) => (
          <span
            key={b}
            className="shrink-0 rounded-full border border-[#b026ff]/25 bg-[#120a22]/80 px-3 py-1.5 text-[0.7rem] font-semibold text-[#cbb6e9]"
          >
            {b}
          </span>
        ))}
      </div>

      {/* BANNERS */}
      {banners.length > 0 && (
        <section className="mt-8">
          <BannerCarousel banners={banners} />
        </section>
      )}

      {/* CATEGORÍAS */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="section-title text-white">Categorías</h2>
            <p className="text-xs text-[#9b86bd]">Explora por tipo de producto</p>
          </div>
          <Link href="/catalogo" className="text-xs font-semibold text-[#c77dff] hover:underline">
            Ver todo
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="card card-hover group relative overflow-hidden p-5 sm:p-6"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#b026ff]/20 blur-2xl transition group-hover:bg-[#b026ff]/35" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <span className="text-2xl">{cat.icon || "🛍️"}</span>
                  <h3 className="mt-2 text-lg font-black tracking-wide text-white">{cat.name}</h3>
                  <p className="mt-1 line-clamp-2 max-w-xs text-xs text-[#a291bd]">
                    {cat.description || "Explora los productos de esta categoría."}
                  </p>
                </div>
                <span className="text-[#c77dff] transition group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}

          {categories.length === 0 && (
            <div className="card p-6 text-sm text-[#a291bd] sm:col-span-2">
              Aún no hay categorías activas. Crea las categorías desde el panel administrador.
            </div>
          )}
        </div>
      </section>

      {/* DESTACADOS */}
      {featured.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="section-title text-white">Productos destacados</h2>
              <p className="text-xs text-[#9b86bd]">Lo más vendido de la tienda</p>
            </div>
            <Link
              href="/catalogo?sort=recientes"
              className="text-xs font-semibold text-[#c77dff] hover:underline"
            >
              Ver más
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={store.currency}
                categoryName={categoryMap.get(product.category_id) ?? product.categories?.name}
                subcategoryName={product.subcategories?.name}
              />
            ))}
          </div>
        </section>
      )}

      {/* OFERTAS */}
      {offers.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="section-title text-white">Ofertas 🔥</h2>
              <p className="text-xs text-[#9b86bd]">Precios especiales por tiempo limitado</p>
            </div>
            <Link href="/catalogo?ofertas=1" className="text-xs font-semibold text-[#c77dff] hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {offers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={store.currency}
                categoryName={categoryMap.get(product.category_id) ?? product.categories?.name}
                subcategoryName={product.subcategories?.name}
              />
            ))}
          </div>
        </section>
      )}

      {/* NOVEDADES */}
      {novedades.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="section-title text-white">Novedades</h2>
              <p className="text-xs text-[#9b86bd]">Recién agregados al catálogo</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {novedades.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={store.currency}
                categoryName={categoryMap.get(product.category_id) ?? product.categories?.name}
                subcategoryName={product.subcategories?.name}
              />
            ))}
          </div>
        </section>
      )}

      {!hasProducts && (
        <section className="mt-10">
          <div className="card p-8 text-center">
            <p className="text-3xl">🛍️</p>
            <h3 className="mt-2 text-lg font-bold text-white">El catálogo está vacío</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#a291bd]">
              Agrega tus primeros productos desde el panel administrador. Las categorías FREE FIRE
              y STREAMING ya están creadas con sus subcategorías.
            </p>
            <Link href="/admin/productos" className="btn btn-primary mt-4">
              Ir al panel administrador
            </Link>
          </div>
        </section>
      )}

      {/* CÓMO FUNCIONA */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { n: "01", t: "Elige tu producto", d: "Explora categorías, ofertas y novedades." },
          { n: "02", t: "Paga y confirma", d: "Usa tu saldo o envía el comprobante del pago." },
          { n: "03", t: "Recibe tu entrega", d: "Automática al aprobarse o manual por el equipo." },
        ].map((step) => (
          <div key={step.n} className="card p-5">
            <span className="text-xs font-black tracking-[0.2em] text-[#b026ff]">{step.n}</span>
            <h3 className="mt-2 text-sm font-bold text-white">{step.t}</h3>
            <p className="mt-1 text-xs text-[#a291bd]">{step.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
