export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function formatMoney(value: number | string | null | undefined, currency = "USD"): string {
  const amount = Number(value ?? 0);
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatDate(value: string | null | undefined, withTime = true): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function orderNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MS-${stamp}-${random}`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  en_proceso: "En proceso",
  entregado: "Entregado",
  cancelado: "Cancelado",
  rechazado: "Rechazado",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  reembolsado: "Reembolsado",
};

export const ORDER_STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pagado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  en_proceso: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  entregado: "bg-violet-500/20 text-violet-200 border-violet-400/40",
  cancelado: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  rechazado: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function statusStyle(status: string): string {
  return ORDER_STATUS_STYLE[status] ?? "bg-white/5 text-zinc-300 border-white/10";
}
