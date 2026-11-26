import CrudManager, { type AdminColumn, type AdminField } from "@/components/admin/CrudManager";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDataAccess } from "@/lib/env";
import type { Banner } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const session = await requireAdmin();
  if (!session) return null;

  const supabase = hasDataAccess() ? await createSupabaseAdminClient() : await createSupabaseServerClient();
  if (!supabase) return <p className="card p-4 text-sm text-rose-300">Supabase no está configurado.</p>;

  const { data } = await supabase.from("banners").select("*").order("sort_order");
  const banners = (data as Banner[] | null) ?? [];

  const fields: AdminField[] = [
    { name: "title", label: "Título", type: "text", required: true },
    { name: "subtitle", label: "Subtítulo", type: "text" },
    { name: "cta_label", label: "Texto del botón", type: "text", placeholder: "Ver ofertas" },
    { name: "link_url", label: "Enlace del botón", type: "text", placeholder: "/catalogo" },
    {
      name: "position",
      label: "Ubicación",
      type: "select",
      defaultValue: "home",
      options: [
        { value: "home", label: "Inicio" },
        { value: "category", label: "Categorías" },
        { value: "popup", label: "Aviso emergente" },
      ],
    },
    { name: "sort_order", label: "Orden", type: "number", defaultValue: 0 },
    { name: "image_url", label: "Imagen", type: "image" },
    { name: "is_active", label: "Visible", type: "checkbox", defaultValue: true },
  ];

  const columns: AdminColumn[] = [
    { key: "image_url", label: "", type: "image" },
    { key: "title", label: "Título" },
    { key: "position", label: "Ubicación" },
    { key: "sort_order", label: "Orden" },
    { key: "is_active", label: "Activo", type: "bool" },
  ];

  return (
    <CrudManager
      entity="banners"
      title="Banners y promociones"
      description="Los banners activos aparecen en la página de inicio."
      fields={fields}
      columns={columns}
      rows={banners.map((b) => ({ ...b, sort_order: Number(b.sort_order) }))}
      createLabel="Nuevo banner"
      emptyText="No hay banners. La tienda usa un banner por defecto."
    />
  );
}
