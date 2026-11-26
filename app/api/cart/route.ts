import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasDataAccess } from "@/lib/env";
import type { CartItem, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

async function resolveCartId(userId: string): Promise<string | null> {
  const admin = await createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await admin
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) return null;
  return created.id;
}

async function loadCart(userId: string) {
  const admin = await createSupabaseAdminClient();
  const { data: cart } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!cart?.id) return { items: [] as CartItem[], subtotal: 0 };

  const { data: rows } = await admin
    .from("cart_items")
    .select("id, cart_id, product_id, quantity, products(*)")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  const items: CartItem[] = (rows ?? [])
    .map((row) => {
      const product = (row as unknown as { products: Product | null }).products;
      if (!product) return null;
      return {
        id: row.id as string,
        cart_id: row.cart_id as string,
        product_id: row.product_id as string,
        quantity: row.quantity as number,
        product,
      };
    })
    .filter((item): item is CartItem => item !== null);

  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.product.price) * item.quantity,
    0,
  );

  return { items, subtotal };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [], subtotal: 0, authenticated: false });
  if (!hasDataAccess()) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 503 },
    );
  }

  const cart = await loadCart(user.id);
  return NextResponse.json({ ...cart, authenticated: true });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para comprar." }, { status: 401 });

  if (!hasDataAccess()) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    productId?: string;
    quantity?: number;
  };
  if (!body.productId) {
    return NextResponse.json({ error: "Producto inválido." }, { status: 400 });
  }
  const quantity = Math.min(Math.max(Number(body.quantity ?? 1), 1), 99);

  const admin = await createSupabaseAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("id, is_active, stock")
    .eq("id", body.productId)
    .maybeSingle();

  if (!product || !product.is_active) {
    return NextResponse.json({ error: "Producto no disponible." }, { status: 404 });
  }
  if (Number(product.stock) <= 0) {
    return NextResponse.json({ error: "Producto agotado." }, { status: 409 });
  }

  const cartId = await resolveCartId(user.id);
  if (!cartId) {
    return NextResponse.json({ error: "No se pudo crear el carrito." }, { status: 500 });
  }

  const { data: existing } = await admin
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", body.productId)
    .maybeSingle();

  if (existing) {
    const nextQty = Math.min(existing.quantity + quantity, 99);
    const { error } = await admin
      .from("cart_items")
      .update({ quantity: nextQty })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin
      .from("cart_items")
      .insert({ cart_id: cartId, product_id: body.productId, quantity });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cart = await loadCart(user.id);
  return NextResponse.json(cart);
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    itemId?: string;
    quantity?: number;
  };
  if (!body.itemId) return NextResponse.json({ error: "Ítem inválido." }, { status: 400 });

  const admin = await createSupabaseAdminClient();
  const quantity = Math.min(Math.max(Number(body.quantity ?? 1), 0), 99);

  const { data: item } = await admin
    .from("cart_items")
    .select("id, cart_id, carts!inner(user_id)")
    .eq("id", body.itemId)
    .maybeSingle();

  const owner = (item as unknown as { carts: { user_id: string } | null } | null)?.carts
    ?.user_id;
  if (!item || owner !== user.id) {
    return NextResponse.json({ error: "Ítem no encontrado." }, { status: 404 });
  }

  if (quantity === 0) {
    await admin.from("cart_items").delete().eq("id", body.itemId);
  } else {
    await admin.from("cart_items").update({ quantity }).eq("id", body.itemId);
  }

  return NextResponse.json(await loadCart(user.id));
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const clear = searchParams.get("clear") === "1";
  const admin = await createSupabaseAdminClient();

  const { data: cart } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cart?.id) return NextResponse.json({ items: [], subtotal: 0 });

  if (clear) {
    await admin.from("cart_items").delete().eq("cart_id", cart.id);
  } else if (itemId) {
    await admin.from("cart_items").delete().eq("id", itemId).eq("cart_id", cart.id);
  }

  return NextResponse.json(await loadCart(user.id));
}
