import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CartItem, Product } from "@/lib/types";

export type CartPayload = { items: CartItem[]; subtotal: number };

export async function loadCart(userId: string): Promise<CartPayload> {
  const admin = await createSupabaseAdminClient();

  const { data: cart } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!cart?.id) return { items: [], subtotal: 0 };

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
      } satisfies CartItem;
    })
    .filter((item): item is CartItem => item !== null);

  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.product.price) * item.quantity,
    0,
  );

  return { items, subtotal: Math.round(subtotal * 100) / 100 };
}

export async function clearCart(userId: string): Promise<void> {
  const admin = await createSupabaseAdminClient();
  const { data: cart } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!cart?.id) return;
  await admin.from("cart_items").delete().eq("cart_id", cart.id);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.quantity, 0);
}
