import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDataAccess } from "@/lib/env";
import { getMaintenanceSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type RpcResult = {
  orderId?: string;
  orderNumber?: string;
  duplicated?: boolean;
};

/**
 * Crea el pedido desde el carrito del usuario.
 *
 * Toda la operación (validación de stock, precios reales, descuento de stock,
 * cobro con saldo, movimiento de cartera, pago, notificación y vaciado del
 * carrito) ocurre dentro de la función `create_order_from_cart` de Postgres,
 * de forma atómica y a prueba de manipulación desde el navegador.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  }
  if (!hasDataAccess()) {
    return NextResponse.json(
      { error: "La tienda aún no está instalada en Supabase." },
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

  const { data, error } = await supabase.rpc("create_order_from_cart", {
    p_payment_method: method,
    p_contact: body.contact?.slice(0, 200) || null,
    p_notes: body.notes?.slice(0, 1000) || null,
    p_idempotency: idempotencyKey,
  });

  if (error) {
    const message = error.message ?? "";

    if (message.includes("EMPTY_CART")) {
      return NextResponse.json({ error: "Tu carrito está vacío." }, { status: 400 });
    }
    if (message.includes("INSUFFICIENT_BALANCE")) {
      return NextResponse.json({ error: "Saldo insuficiente." }, { status: 402 });
    }
    if (message.includes("ACCOUNT_BLOCKED")) {
      return NextResponse.json({ error: "Tu cuenta está bloqueada." }, { status: 403 });
    }
    if (message.includes("PROFILE_NOT_FOUND")) {
      return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    }
    if (message.includes("INSUFFICIENT_STOCK:")) {
      const name = message.split("INSUFFICIENT_STOCK:")[1]?.trim() ?? "";
      return NextResponse.json(
        { error: `Stock insuficiente para "${name}".` },
        { status: 409 },
      );
    }
    if (message.includes("PRODUCT_UNAVAILABLE:")) {
      const name = message.split("PRODUCT_UNAVAILABLE:")[1]?.trim() ?? "";
      return NextResponse.json(
        { error: `El producto "${name}" ya no está disponible.` },
        { status: 409 },
      );
    }
    if (error.code === "23505" && idempotencyKey) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing?.id) {
        return NextResponse.json({ orderId: existing.id, duplicated: true });
      }
    }
    if (error.code === "42883") {
      return NextResponse.json(
        { error: "Falta aplicar el esquema de Supabase (supabase/schema.sql)." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: message || "No se pudo crear el pedido." },
      { status: 500 },
    );
  }

  const result = (data ?? {}) as RpcResult;
  if (!result.orderId) {
    return NextResponse.json({ error: "No se pudo crear el pedido." }, { status: 500 });
  }

  return NextResponse.json(result);
}
