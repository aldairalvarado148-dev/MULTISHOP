import CrudManager, { type AdminColumn, type AdminField } from "@/components/admin/CrudManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/env";
import type { Category, Subcategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasServiceRole() ? createSupabaseAdminClient() : await createSupabaseServerClient();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const [{ data: categories }, { data: subcategories }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("subcategories").select("*").order("sort_order"),
  ]);

  const cats = (categories as Category[] | null) ?? [];
  const subs = (subcategories as Subcategory[] | null) ?? [];
  const catName = new Map(cats.map((c) => [c.id, c.name]));

  const categoryFields: AdminField[] = [
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "slug", label: "Slug (URL)", type: "text", help: "Se genera solo si lo dejas vacío." },
    { name: "icon", label: "Icono (emoji o texto)", type: "text", placeholder: "🔥" },
    { name: "sort_order", label: "Orden", type: "number", defaultValue: 0 },
    { name: "image_url", label: "Imagen", type: "image" },
    { name: "description", label: "Descripción", type: "textarea" },
    { name: "is_active", label: "Visible en la tienda", type: "checkbox", defaultValue: true },
  ];

  const categoryColumns: AdminColumn[] = [
    { key: "icon", label: "Icono" },
    { key: "name", label: "Categoría" },
    { key: "slug", label: "Slug", type: "code" },
    { key: "sort_order", label: "Orden" },
    { key: "is_active", label: "Activa", type: "bool" },
  ];

  const subFields: AdminField[] = [
    {
      name: "category_id",
      label: "Categoría padre",
      type: "select",
      required: true,
      options: cats.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "slug", label: "Slug (URL)", type: "text" },
    { name: "icon", label: "Icono", type: "text", placeholder: "💎" },
    { name: "sort_order", label: "Orden", type: "number", defaultValue: 0 },
    { name: "image_url", label: "Imagen", type: "image" },
    { name: "description", label: "Descripción", type: "textarea" },
    { name: "is_active", label: "Visible en la tienda", type: "checkbox", defaultValue: true },
  ];

  const subColumns: AdminColumn[] = [
    { key: "icon", label: "Icono" },
    { key: "name", label: "Subcategoría" },
    { key: "category_name", label: "Categoría" },
    { key: "sort_order", label: "Orden" },
    { key: "is_active", label: "Activa", type: "bool" },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#b026ff]/25 bg-[#b026ff]/5 p-4 text-xs text-[#c9b8e6]">
        La tienda inicia con <strong className="text-white">FREE FIRE</strong> y{" "}
        <strong className="text-white">STREAMING</strong>. Puedes crear nuevas categorías aquí cuando lo
        necesites: aparecerán automáticamente en la tienda sin tocar código.
      </div>

      <CrudManager
        entity="categories"
        title="Categorías principales"
        description="Nombre, descripción, imagen, icono, orden, activación y eliminación."
        fields={categoryFields}
        columns={categoryColumns}
        rows={cats.map((c) => ({ ...c, sort_order: Number(c.sort_order) }))}
        createLabel="Nueva categoría"
        emptyText="No hay categorías."
      />

      <CrudManager
        entity="subcategories"
        title="Subcategorías"
        description="Cada subcategoría pertenece a una categoría principal."
        fields={subFields}
        columns={subColumns}
        rows={subs.map((s) => ({
          ...s,
          sort_order: Number(s.sort_order),
          category_name: catName.get(s.category_id) ?? "—",
        }))}
        createLabel="Nueva subcategoría"
        emptyText="No hay subcategorías."
      />
    </div>
  );
}
