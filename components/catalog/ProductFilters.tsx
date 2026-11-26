"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { Category, Subcategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ProductFilters({
  categories,
  subcategories,
}: {
  categories: Category[];
  subcategories: Subcategory[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const current = {
    q: params.get("q") ?? "",
    categoria: params.get("categoria") ?? "",
    sub: params.get("sub") ?? "",
    min: params.get("min") ?? "",
    max: params.get("max") ?? "",
    sort: params.get("sort") ?? "recientes",
    ofertas: params.get("ofertas") === "1",
  };

  const [q, setQ] = useState(current.q);
  const [min, setMin] = useState(current.min);
  const [max, setMax] = useState(current.max);

  const push = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.push(qs ? `/catalogo?${qs}` : "/catalogo");
    },
    [params, router],
  );

  const visibleSubs = current.categoria
    ? subcategories.filter(
        (s) => s.category_id === categories.find((c) => c.slug === current.categoria)?.id,
      )
    : subcategories;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="label" htmlFor="filter-q">
          Buscar
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            push({ q: q.trim() || null });
          }}
          className="flex gap-2"
        >
          <input
            id="filter-q"
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre del producto"
          />
          <button type="submit" className="btn btn-primary shrink-0 px-3">
            🔍
          </button>
        </form>
      </div>

      <div className="card p-4">
        <p className="label">Categorías</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => push({ categoria: null, sub: null })}
            className={cn("chip", !current.categoria && "chip-active")}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => push({ categoria: cat.slug, sub: null })}
              className={cn("chip", current.categoria === cat.slug && "chip-active")}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {visibleSubs.length > 0 && (
          <>
            <p className="label mt-4">Subcategorías</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => push({ sub: null })}
                className={cn("chip", !current.sub && "chip-active")}
              >
                Todas
              </button>
              {visibleSubs.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => push({ sub: sub.slug, categoria: current.categoria || null })}
                  className={cn("chip", current.sub === sub.slug && "chip-active")}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card p-4">
        <p className="label">Precio</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            push({ min: min.trim() || null, max: max.trim() || null });
          }}
          className="flex items-center gap-2"
        >
          <input
            className="input"
            inputMode="decimal"
            placeholder="Mín"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            aria-label="Precio mínimo"
          />
          <span className="text-xs text-[#8f7aab]">—</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="Máx"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            aria-label="Precio máximo"
          />
          <button type="submit" className="btn btn-ghost shrink-0 px-3">
            OK
          </button>
        </form>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-[#c4b3e0]">
          <input
            type="checkbox"
            checked={current.ofertas}
            onChange={(e) => push({ ofertas: e.target.checked ? "1" : null })}
            className="h-4 w-4 accent-[#b026ff]"
          />
          Solo ofertas
        </label>
      </div>

      <div className="card p-4">
        <label className="label" htmlFor="filter-sort">
          Ordenar por
        </label>
        <select
          id="filter-sort"
          className="input"
          value={current.sort}
          onChange={(e) => push({ sort: e.target.value })}
        >
          <option value="recientes">Más recientes</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="nombre">Nombre A–Z</option>
        </select>
        <button
          type="button"
          onClick={() => router.push("/catalogo")}
          className="mt-3 w-full text-center text-xs text-[#c77dff] hover:underline"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
