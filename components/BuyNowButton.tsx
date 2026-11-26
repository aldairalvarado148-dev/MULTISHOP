"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BuyNowButton({
  productId,
  disabled,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(`/login?next=/producto/${data.slug ?? ""}`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo continuar.");
        return;
      }
      router.push("/carrito");
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={buy}
        disabled={disabled || loading}
        className="btn btn-ghost w-full"
      >
        {loading ? "Procesando…" : "Comprar ahora"}
      </button>
      {error && <p className="mt-2 text-center text-xs text-rose-300">{error}</p>}
    </div>
  );
}
