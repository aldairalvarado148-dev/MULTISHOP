import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import CartView from "@/components/cart/CartView";
import { getSession } from "@/lib/auth";
import { loadCart } from "@/lib/cart";
import { hasDataAccess } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const session = await getSession();
  const store = await getStoreSettings();

  if (!session.userId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          icon="🔐"
          title="Inicia sesión para ver tu carrito"
          description="Tu carrito se guarda en tu cuenta y se mantiene en todos tus dispositivos."
          actionLabel="Iniciar sesión"
          actionHref="/login?next=/carrito"
        />
        <p className="mt-4 text-center text-xs text-[#8f7aab]">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-[#c77dff] hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    );
  }

  if (!hasDataAccess()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          icon="⚙️"
          title="Configuración incompleta"
          description="Inicia sesión para guardar tu carrito en tu cuenta, disponible en cualquier dispositivo."
          actionLabel="Ver guía de conexión"
          actionHref="/configuracion"
        />
      </div>
    );
  }

  const cart = await loadCart(session.userId);
  const balance = Number(session.profile?.balance ?? 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Mi carrito</h1>
      <p className="mt-1 text-sm text-[#a291bd]">
        {cart.items.length} producto{cart.items.length === 1 ? "" : "s"} · guardado en tu cuenta
      </p>

      <div className="mt-6">
        <CartView
          initialItems={cart.items}
          currency={store.currency}
          balance={balance}
          paymentInstructions={store.payment_instructions}
        />
      </div>
    </div>
  );
}
