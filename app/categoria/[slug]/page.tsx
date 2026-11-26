import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import {
  getCategoryBySlug,
  getProducts,
  getSubcategories,
} from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
}) {
  const { slug } = await params;
  const { sub } = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [store, subcategories, products] = await Promise.all([
    getStoreSettings(),
    getSubcategories(category.id),
    getProducts({ category: slug, subcategory: sub, limit: 120 }),
  ]);

  const activeSub = subcategories.find((s) => s.slug === sub);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 flex items-center gap-2 text-xs text-[#8f7aab]">
        <Link href="/" className="hover:text-[#c77dff]">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/catalogo" className="hover:text-[#c77dff]">
          Catálogo
        </Link>
        <span>/</span>
        <span className="text-[#d8c8f2]">{category.name}</span>
        {activeSub && (
          <>
            <span>/</span>
            <span className="text-[#d8c8f2]">{activeSub.name}</span>
          </>
        )}
      </nav>

      <header className="card relative mb-6 overflow-hidden p-6">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#b026ff]/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="text-3xl">{category.icon || "🛍️"}</span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {category.name}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#a291bd]">
              {category.description || "Explora todos los productos de esta categoría."}
            </p>
          </div>
        </div>
      </header>

      {subcategories.length > 0 && (
        <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
          <Link
            href={`/categoria/${category.slug}`}
            className={cn("chip shrink-0", !sub && "chip-active")}
          >
            Todas
          </Link>
          {subcategories.map((s) => (
            <Link
              key={s.id}
              href={`/categoria/${category.slug}?sub=${s.slug}`}
              className={cn("chip shrink-0", sub === s.slug && "chip-active")}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Sin productos en esta sección"
          description="Pronto agregaremos productos aquí. Mientras tanto, revisa el resto del catálogo."
          actionLabel="Ver catálogo"
          actionHref="/catalogo"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={store.currency}
              categoryName={category.name}
              subcategoryName={product.subcategories?.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
