"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AddToCartButton({
  productId,
  disabled,
  compact,
  quantity = 1,
  label,
  redirectToCart,
}: {
  productId: string;
  disabled?: boolean;
  compact?: boolean;
  quantity?: number;
  label?: string;
  redirectToCart?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "No se pudo agregar al carrito.");
        return;
      }
      setState("done");
      if (redirectToCart) {
        router.push("/carrito");
      } else {
        router.refresh();
      }
      setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  }

  return (
    <div className={compact ? "" : "space-y-2"}>
      <button
        type="button"
        onClick={add}
        disabled={disabled || state === "loading"}
        className={cn("btn btn-primary w-full", compact && "py-2 text-xs")}
      >
        {state === "loading"
          ? "Agregando…"
          : state === "done"
            ? "✓ En el carrito"
            : disabled
              ? "Agotado"
              : (label ?? "Agregar al carrito")}
      </button>
      {message && <p className="text-xs text-rose-300">{message}</p>}
    </div>
  );
}
