import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Banner, Category, Product, Subcategory } from "@/lib/types";

export type ProductWithMeta = Product & {
  categories: { name: string; slug: string } | null;
  subcategories: { name: string; slug: string } | null;
};

export type CatalogFilters = {
  q?: string;
  category?: string;
  subcategory?: string;
  min?: number;
  max?: number;
  sort?: "recientes" | "precio_asc" | "precio_desc" | "nombre";
  onlyOffers?: boolean;
  limit?: number;
};

const PRODUCT_SELECT =
  "*, categories(name, slug), subcategories(name, slug)";

export async function getActiveCategories(): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data as Category[] | null) ?? [];
}

export async function getAllCategories(): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data as Category[] | null) ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Category | null) ?? null;
}

export async function getSubcategories(categoryId: string): Promise<Subcategory[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data as Subcategory[] | null) ?? [];
}

export async function getProducts(filters: CatalogFilters = {}): Promise<ProductWithMeta[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true);

  if (filters.category) {
    const category = await getCategoryBySlug(filters.category);
    if (!category) return [];
    query = query.eq("category_id", category.id);
  }
  if (filters.subcategory) {
    const supabase2 = await createSupabaseServerClient();
    if (supabase2) {
      const { data: sub } = await supabase2
        .from("subcategories")
        .select("id")
        .eq("slug", filters.subcategory)
        .maybeSingle();
      if (sub?.id) query = query.eq("subcategory_id", sub.id);
    }
  }
  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (typeof filters.min === "number" && Number.isFinite(filters.min)) {
    query = query.gte("price", filters.min);
  }
  if (typeof filters.max === "number" && Number.isFinite(filters.max)) {
    query = query.lte("price", filters.max);
  }
  if (filters.onlyOffers) query = query.eq("is_offer", true);

  switch (filters.sort) {
    case "precio_asc":
      query = query.order("price", { ascending: true });
      break;
    case "precio_desc":
      query = query.order("price", { ascending: false });
      break;
    case "nombre":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.order("sort_order", { ascending: true }).limit(filters.limit ?? 60);

  const { data } = await query;
  return (data as ProductWithMeta[] | null) ?? [];
}

export async function getFeaturedProducts(limit = 8): Promise<ProductWithMeta[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  return (data as ProductWithMeta[] | null) ?? [];
}

export async function getOfferProducts(limit = 8): Promise<ProductWithMeta[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("is_offer", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ProductWithMeta[] | null) ?? [];
}

export async function getNewProducts(limit = 8): Promise<ProductWithMeta[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ProductWithMeta[] | null) ?? [];
}

export async function getProductBySlug(slug: string): Promise<ProductWithMeta | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  return (data as ProductWithMeta | null) ?? null;
}

export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
  limit = 4,
): Promise<ProductWithMeta[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .limit(limit);
  return (data as ProductWithMeta[] | null) ?? [];
}

export async function getHomeBanners(): Promise<Banner[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .eq("position", "home")
    .order("sort_order", { ascending: true });
  return (data as Banner[] | null) ?? [];
}
