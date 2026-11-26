import CrudManager, { type AdminColumn, type AdminField } from "@/components/admin/CrudManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDataAccess } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";
import type { Category, Product, Subcategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasDataAccess() ? await createSupabaseAdminClient() : await createSupabaseServerClient();
  const store = await getStoreSettings();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const [{ data: products }, { data: categories }, { data: subcategories }] = await Promise.all([
    supabase.from("products").select("*").order("sort_order").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("subcategories").select("*").order("sort_order"),
  ]);

  const cats = (categories as Category[] | null) ?? [];
  const subs = (subcategories as Subcategory[] | null) ?? [];
  const items = (products as Product[] | null) ?? [];

  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const subName = new Map(subs.map((s) => [s.id, s.name]));

  const rows = items.map((p) => ({
    id: p.id,
    image_url: p.image_url,
    name: p.name,
    category_id: p.category_id,
    category_name: catName.get(p.category_id) ?? "—",
    subcategory_id: p.subcategory_id,
    subcategory_name: p.subcategory_id ? subName.get(p.subcategory_id) ?? "—" : "—",
    price: Number(p.price),
    compare_at_price: p.compare_at_price === null ? "" : Number(p.compare_at_price),
    stock: Number(p.stock),
    sku: p.sku,
    slug: p.slug,
    description: p.description,
    delivery_type: p.delivery_type,
    delivery_instructions: p.delivery_instructions,
    is_active: p.is_active,
    is_featured: p.is_featured,
    is_offer: p.is_offer,
    is_new: p.is_new,
    sort_order: Number(p.sort_order),
  }));

  const fields: AdminField[] = [
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "slug", label: "Slug (URL)", type: "text", help: "Se genera automáticamente si lo dejas vacío." },
    {
      name: "category_id",
      label: "Categoría",
      type: "select",
      required: true,
      options: cats.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: "subcategory_id",
      label: "Subcategoría",
      type: "select",
      parentField: "category_id",
      options: subs.map((s) => ({ value: s.id, label: s.name, parent: s.category_id })),
    },
    { name: "price", label: `Precio (${store.currency})`, type: "number", required: true },
    { name: "compare_at_price", label: "Precio anterior (tachado)", type: "number" },
    { name: "stock", label: "Stock", type: "number", defaultValue: 10 },
    { name: "sku", label: "SKU / código", type: "text" },
    {
      name: "delivery_type",
      label: "Tipo de entrega",
      type: "select",
      defaultValue: "manual",
      options: [
        { value: "manual", label: "Manual (coordinada por el admin)" },
        { value: "automatic", label: "Automática (datos listos)" },
      ],
    },
    { name: "sort_order", label: "Orden", type: "number", defaultValue: 0 },
    { name: "image_url", label: "Imagen", type: "image" },
    { name: "description", label: "Descripción", type: "textarea" },
    { name: "delivery_instructions", label: "Instrucciones de entrega (visibles al cliente)", type: "textarea" },
    { name: "is_active", label: "Visible en la tienda", type: "checkbox", defaultValue: true },
    { name: "is_featured", label: "Destacado", type: "checkbox" },
    { name: "is_offer", label: "En oferta", type: "checkbox" },
    { name: "is_new", label: "Novedad", type: "checkbox" },
  ];

  const columns: AdminColumn[] = [
    { key: "image_url", label: "", type: "image" },
    { key: "name", label: "Producto" },
    { key: "category_name", label: "Categoría" },
    { key: "subcategory_name", label: "Subcategoría" },
    { key: "price", label: "Precio", type: "money" },
    { key: "stock", label: "Stock" },
    { key: "is_active", label: "Activo", type: "bool" },
  ];

  return (
    <CrudManager
      entity="products"
      title="Productos"
      description="Crea y administra el catálogo. Los cambios se guardan en Supabase al instante."
      fields={fields}
      columns={columns}
      rows={rows}
      createLabel="Nuevo producto"
      currency={store.currency}
      emptyText="Aún no hay productos. Crea el primero."
    />
  );
}
