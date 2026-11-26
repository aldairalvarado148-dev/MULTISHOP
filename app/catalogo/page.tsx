import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import ProductFilters from "@/components/catalog/ProductFilters";
import EmptyState from "@/components/EmptyState";
import { getActiveCategories, getProducts } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Subcategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const q = get("q") ?? "";
  const categoria = get("categoria") ?? "";
  const sub = get("sub") ?? "";
  const min = get("min");
  const max = get("max");
  const sort = (get("sort") ?? "recientes") as "recientes" | "precio_asc" | "precio_desc" | "nombre";
  const ofertas = get("ofertas") === "1";

  const [store, categories, products] = await Promise.all([
    getStoreSettings(),
    getActiveCategories(),
    getProducts({
      q,
      category: categoria || undefined,
      subcategory: sub || undefined,
      min: min ? Number(min) : undefined,
      max: max ? Number(max) : undefined,
      sort,
      onlyOffers: ofertas,
      limit: 120,
    }),
  ]);

  const supabase = await createSupabaseServerClient();
  let subcategories: Subcategory[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("subcategories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    subcategories = (data as Subcategory[] | null) ?? [];
  }

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const activeCategory = categories.find((c) => c.slug === categoria);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 flex items-center gap-2 text-xs text-[#8f7aab]">
        <Link href="/" className="hover:text-[#c77dff]">
          Inicio
        </Link>
        <span>/</span>
        <span className="text-[#d8c8f2]">Catálogo</span>
        {activeCategory && (
          <>
            <span>/</span>
            <span className="text-[#d8c8f2]">{activeCategory.name}</span>
          </>
        )}
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {activeCategory ? activeCategory.name : "Catálogo completo"}
        </h1>
        <p className="mt-1 text-sm text-[#a291bd]">
          {products.length} producto{products.length === 1 ? "" : "s"} disponible
          {products.length === 1 ? "" : "s"}
          {q ? ` para “${q}”` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<div className="card h-40 animate-pulse" />}>
            <ProductFilters categories={categories} subcategories={subcategories} />
          </Suspense>
        </aside>

        <section>
          {products.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No encontramos productos"
              description="Prueba con otros filtros o revisa el catálogo completo."
              actionLabel="Ver todo el catálogo"
              actionHref="/catalogo"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currency={store.currency}
                  categoryName={categoryNames.get(product.category_id) ?? product.categories?.name}
                  subcategoryName={product.subcategories?.name}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
