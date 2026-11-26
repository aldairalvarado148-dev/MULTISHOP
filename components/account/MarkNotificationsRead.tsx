"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MarkNotificationsRead() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={markRead}
      disabled={loading}
      className="text-xs text-[#c77dff] hover:underline disabled:opacity-50"
    >
      {loading ? "Marcando…" : "Marcar como leídas"}
    </button>
  );
}
