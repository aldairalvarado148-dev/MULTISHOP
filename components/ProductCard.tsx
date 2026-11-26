import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import AddToCartButton from "@/components/AddToCartButton";

export default function ProductCard({
  product,
  currency,
  categoryName,
  subcategoryName,
}: {
  product: Product;
  currency: string;
  categoryName?: string;
  subcategoryName?: string;
}) {
  const hasDiscount =
    product.compare_at_price !== null && Number(product.compare_at_price) > Number(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
    : 0;
  const soldOut = product.stock <= 0;

  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link href={`/producto/${product.slug}`} className="relative block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(176,38,255,0.28),rgba(8,4,16,0.9))]">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-4xl opacity-60">
              {product.delivery_type === "automatic" ? "⚡" : "🎁"}
            </div>
          )}

          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="rounded-md bg-[#f43f5e] px-2 py-0.5 text-[0.62rem] font-black text-white">
                -{discountPct}%
              </span>
            )}
            {product.is_new && (
              <span className="rounded-md bg-[#7c3aed] px-2 py-0.5 text-[0.62rem] font-black text-white">
                NUEVO
              </span>
            )}
            {product.is_featured && (
              <span className="rounded-md bg-[#b026ff] px-2 py-0.5 text-[0.62rem] font-black text-white">
                DESTACADO
              </span>
            )}
          </div>

          {soldOut && (
            <div className="absolute inset-0 grid place-items-center bg-black/65">
              <span className="rounded-lg border border-white/20 bg-black/60 px-3 py-1 text-xs font-bold tracking-wide text-white">
                AGOTADO
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#9b86bd]">
          {categoryName && <span>{categoryName}</span>}
          {subcategoryName && (
            <>
              <span className="text-[#5f4d7a]">•</span>
              <span className="text-[#b49bd6]">{subcategoryName}</span>
            </>
          )}
        </div>

        <Link
          href={`/producto/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold leading-snug text-white transition group-hover:text-[#dcbaff]"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-lg font-black text-white">{formatMoney(product.price, currency)}</p>
            {hasDiscount && (
              <p className="text-xs text-[#8b7aa8] line-through">
                {formatMoney(product.compare_at_price, currency)}
              </p>
            )}
          </div>
          <span className="text-[0.62rem] font-bold uppercase tracking-wide text-[#8b7aa8]">
            {product.delivery_type === "automatic" ? "⚡ Auto" : "👤 Manual"}
          </span>
        </div>

        <AddToCartButton productId={product.id} disabled={soldOut} compact />
      </div>
    </article>
  );
}
