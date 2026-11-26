import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

type EntityConfig = {
  table: string;
  fields: string[];
  required: string[];
  label: string;
  numeric?: string[];
  boolean?: string[];
};

const ENTITIES: Record<string, EntityConfig> = {
  products: {
    table: "products",
    label: "producto",
    fields: [
      "category_id",
      "subcategory_id",
      "name",
      "slug",
      "description",
      "image_url",
      "price",
      "compare_at_price",
      "stock",
      "sku",
      "delivery_type",
      "delivery_instructions",
      "is_active",
      "is_featured",
      "is_offer",
      "is_new",
      "sort_order",
    ],
    required: ["name", "category_id", "price"],
    numeric: ["price", "compare_at_price", "stock", "sort_order"],
    boolean: ["is_active", "is_featured", "is_offer", "is_new"],
  },
  categories: {
    table: "categories",
    label: "categoría",
    fields: ["name", "slug", "description", "image_url", "icon", "sort_order", "is_active"],
    required: ["name"],
    numeric: ["sort_order"],
    boolean: ["is_active"],
  },
  subcategories: {
    table: "subcategories",
    label: "subcategoría",
    fields: ["category_id", "name", "slug", "description", "image_url", "icon", "sort_order", "is_active"],
    required: ["name", "category_id"],
    numeric: ["sort_order"],
    boolean: ["is_active"],
  },
  banners: {
    table: "banners",
    label: "banner",
    fields: ["title", "subtitle", "image_url", "link_url", "cta_label", "position", "sort_order", "is_active"],
    required: ["title"],
    numeric: ["sort_order"],
    boolean: ["is_active"],
  },
};

function sanitize(config: EntityConfig, body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of config.fields) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (config.numeric?.includes(field)) {
      if (raw === "" || raw === null || raw === undefined) {
        payload[field] = field === "compare_at_price" ? null : 0;
        continue;
      }
      const num = Number(raw);
      payload[field] = Number.isFinite(num) ? num : 0;
    } else if (config.boolean?.includes(field)) {
      payload[field] = Boolean(raw);
    } else if (field === "slug") {
      payload[field] = String(raw ?? "").trim() ? slugify(String(raw)) : null;
    } else if (field === "category_id" || field === "subcategory_id") {
      payload[field] = String(raw ?? "").trim() || null;
    } else if (field === "position") {
      payload[field] = ["home", "category", "popup"].includes(String(raw)) ? String(raw) : "home";
    } else {
      payload[field] = String(raw ?? "").trim() || null;
    }
  }
  return payload;
}

async function logAction(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  session: { userId: string | null; email: string | null },
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown>,
) {
  await admin.from("admin_logs").insert({
    admin_id: session.userId,
    admin_email: session.email,
    action,
    entity,
    entity_id: entityId,
    details,
  });
}

function client() {
  if (!hasServiceRole()) return null;
  return createSupabaseAdminClient();
}

export async function POST(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const admin = client();
  if (!admin) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });

  const { entity } = await params;
  const config = ENTITIES[entity];
  if (!config) return NextResponse.json({ error: "Entidad no válida." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = sanitize(config, body);

  for (const field of config.required) {
    if (!payload[field]) {
      return NextResponse.json({ error: `El campo ${field} es obligatorio.` }, { status: 400 });
    }
  }

  if (config.table !== "banners" && !payload.slug && payload.name) {
    payload.slug = slugify(String(payload.name));
  }
  if (payload.slug && !payload.slug) delete payload.slug;

  const { data, error } = await admin.from(config.table).insert(payload).select("*").single();
  if (error) {
    const message = error.code === "23505" ? "Ya existe un registro con ese slug." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await logAction(admin, session, "crear", config.table, String(data.id), {
    name: (data as { name?: string; title?: string }).name ?? (data as { title?: string }).title,
  });

  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const admin = client();
  if (!admin) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });

  const { entity } = await params;
  const config = ENTITIES[entity];
  if (!config) return NextResponse.json({ error: "Entidad no válida." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Falta el id." }, { status: 400 });

  const payload = sanitize(config, body);
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }
  if (payload.slug === null) delete payload.slug;

  const { data, error } = await admin
    .from(config.table)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Ya existe un registro con ese slug." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await logAction(admin, session, "actualizar", config.table, id, payload);
  return NextResponse.json({ ok: true, row: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const admin = client();
  if (!admin) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });

  const { entity } = await params;
  const config = ENTITIES[entity];
  if (!config) return NextResponse.json({ error: "Entidad no válida." }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id." }, { status: 400 });

  if (config.table === "categories") {
    const { count } = await admin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("category_id", id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "La categoría tiene productos. Muévelos o desactívala en lugar de eliminarla." },
        { status: 409 },
      );
    }
    await admin.from("subcategories").delete().eq("category_id", id);
  }

  if (config.table === "subcategories") {
    await admin.from("products").update({ subcategory_id: null }).eq("subcategory_id", id);
  }

  const { error } = await admin.from(config.table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAction(admin, session, "eliminar", config.table, id, {});
  return NextResponse.json({ ok: true });
}
