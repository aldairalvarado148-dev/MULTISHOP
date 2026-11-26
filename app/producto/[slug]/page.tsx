import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import BuyNowButton from "@/components/BuyNowButton";
import ProductCard from "@/components/ProductCard";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [store, related] = await Promise.all([
    getStoreSettings(),
    getRelatedProducts(product.category_id, product.id, 4),
  ]);

  const price = Number(product.price);
  const compare = product.compare_at_price ? Number(product.compare_at_price) : null;
  const discount = compare && compare > price ? Math.round(((compare - price) / compare) * 100) : 0;
  const available = product.is_active && product.stock > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#8f7aab]">
        <Link href="/" className="hover:text-[#c77dff]">
          Inicio
        </Link>
        <span>/</span>
        {product.categories && (
          <>
            <Link href={`/categoria/${product.categories.slug}`} className="hover:text-[#c77dff]">
              {product.categories.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-[#d8c8f2]">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card relative aspect-square overflow-hidden p-0">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(176,38,255,0.25),rgba(8,4,16,1))] text-6xl">
              🛍️
            </div>
          )}
          {discount > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-[#b026ff] px-3 py-1 text-xs font-black text-white">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {product.subcategories && <span className="badge">{product.subcategories.name}</span>}
            <span
              className={
                available
                  ? "badge border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "badge border-rose-500/30 bg-rose-500/10 text-rose-200"
              }
            >
              {available ? `Disponible · ${product.stock}` : "Agotado"}
            </span>
            {product.delivery_type === "automatica" && (
              <span className="badge">⚡ Entrega automática</span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex items-end gap-3">
            <span className="text-3xl font-black neon-text">{formatMoney(price, store.currency)}</span>
            {compare && compare > price && (
              <span className="pb-1 text-sm text-[#8f7aab] line-through">
                {formatMoney(compare, store.currency)}
              </span>
            )}
          </div>

          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#bda9dd]">
            {product.description || "Sin descripción adicional."}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <AddToCartButton
                productId={product.id}
                disabled={!available}
                label={available ? "Agregar al carrito" : "Agotado"}
              />
            </div>
            <div className="flex-1">
              <BuyNowButton productId={product.id} disabled={!available} />
            </div>
          </div>

          <ul className="mt-6 space-y-2 text-xs text-[#a291bd]">
            <li>✅ Pago verificado antes de confirmar el pedido</li>
            <li>
              {product.delivery_type === "automatica"
                ? "⚡ Entrega automática al aprobarse el pago"
                : "🧑‍💻 Entrega manual por el equipo de soporte"}
            </li>
            <li>🔐 Tus datos están protegidos con políticas RLS</li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title mb-4 text-white">También te puede interesar</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                currency={store.currency}
                categoryName={item.categories?.name}
                subcategoryName={item.subcategories?.name}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
