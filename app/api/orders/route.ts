import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/env";
import { clearCart, loadCart } from "@/lib/cart";
import { getMaintenanceSettings } from "@/lib/settings";
import { orderNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  }
  if (!hasServiceRole()) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para comprar." }, { status: 401 });

  // Bloqueo de compras en modo mantenimiento (validado en el servidor).
  const maintenance = await getMaintenanceSettings();
  if (maintenance.enabled) {
    return NextResponse.json(
      { error: "La tienda está en mantenimiento. No se pueden crear pedidos ahora." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    paymentMethod?: "saldo" | "transferencia";
    contact?: string;
    notes?: string;
    idempotencyKey?: string;
  };

  const method = body.paymentMethod === "saldo" ? "saldo" : "transferencia";
  const idempotencyKey = body.idempotencyKey?.slice(0, 120) || null;

  const admin = createSupabaseAdminClient();

  // Evita pedidos duplicados si el usuario reintenta el mismo checkout.
  if (idempotencyKey) {
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing?.id) {
      return NextResponse.json({ orderId: existing.id, duplicated: true });
    }
  }

  const cart = await loadCart(user.id);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Tu carrito está vacío." }, { status: 400 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, balance, is_blocked, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }
  if (profile.is_blocked) {
    return NextResponse.json({ error: "Tu cuenta está bloqueada." }, { status: 403 });
  }

  // Validación de stock y disponibilidad real.
  for (const item of cart.items) {
    if (!item.product.is_active) {
      return NextResponse.json(
        { error: `El producto "${item.product.name}" ya no está disponible.` },
        { status: 409 },
      );
    }
    if (item.product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Stock insuficiente para "${item.product.name}".` },
        { status: 409 },
      );
    }
  }

  const subtotal = cart.subtotal;
  const total = subtotal;
  const balance = Number(profile.balance ?? 0);

  if (method === "saldo" && balance < total) {
    return NextResponse.json({ error: "Saldo insuficiente." }, { status: 402 });
  }

  const deliveryType = cart.items.some((i) => i.product.delivery_type === "automatic")
    ? "automatic"
    : "manual";

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber(),
      user_id: user.id,
      customer_email: profile.email ?? user.email,
      customer_name: profile.full_name,
      subtotal,
      discount: 0,
      total,
      status: method === "saldo" ? "pagado" : "pendiente",
      payment_status: method === "saldo" ? "aprobado" : "pendiente",
      payment_method: method,
      delivery_type: deliveryType,
      contact: body.contact?.slice(0, 200) || null,
      customer_notes: body.notes?.slice(0, 1000) || null,
      idempotency_key: idempotencyKey,
      paid_at: method === "saldo" ? new Date().toISOString() : null,
    })
    .select("id, order_number, total")
    .single();

  if (orderError || !order) {
    if (orderError?.code === "23505") {
      const { data: existing } = await admin
        .from("orders")
        .select("id")
        .eq("idempotency_key", idempotencyKey ?? "")
        .maybeSingle();
      if (existing?.id) return NextResponse.json({ orderId: existing.id, duplicated: true });
    }
    return NextResponse.json(
      { error: orderError?.message ?? "No se pudo crear el pedido." },
      { status: 500 },
    );
  }

  const itemRows = cart.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product.name,
    product_image: item.product.image_url,
    unit_price: item.product.price,
    quantity: item.quantity,
    subtotal: Number(item.product.price) * item.quantity,
    delivery_type: item.product.delivery_type,
  }));

  const { error: itemsError } = await admin.from("order_items").insert(itemRows);
  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Descuento de stock (evita sobreventa).
  for (const item of cart.items) {
    await admin
      .from("products")
      .update({ stock: Math.max(0, Number(item.product.stock) - item.quantity) })
      .eq("id", item.product_id);
  }

  // Cobro con saldo: descuenta y registra el movimiento.
  if (method === "saldo") {
    const newBalance = Math.round((balance - total) * 100) / 100;
    const { error: balanceError } = await admin
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", user.id);

    if (balanceError) {
      return NextResponse.json({ error: balanceError.message }, { status: 500 });
    }

    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      type: "debito",
      amount: total,
      balance_after: newBalance,
      description: `Compra ${order.order_number}`,
      order_id: order.id,
    });

    await admin.from("payments").insert({
      order_id: order.id,
      user_id: user.id,
      amount: total,
      method: "saldo",
      status: "aprobado",
      reviewed_at: new Date().toISOString(),
      review_notes: "Pago automático con saldo",
    });
  } else {
    await admin.from("payments").insert({
      order_id: order.id,
      user_id: user.id,
      amount: total,
      method,
      status: "pendiente",
    });
  }

  await admin.from("notifications").insert({
    user_id: user.id,
    title: `Pedido ${order.order_number} creado`,
    body:
      method === "saldo"
        ? "Tu pago con saldo fue aprobado. Estamos preparando tu entrega."
        : "Envía tu comprobante para verificar el pago y procesar tu pedido.",
    type: "pedido",
    link: `/compras/${order.id}`,
  });

  await clearCart(user.id);

  return NextResponse.json({ orderId: order.id, orderNumber: order.order_number });
}
