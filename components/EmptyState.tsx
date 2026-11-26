import Link from "next/link";

export default function EmptyState({
  icon = "🛒",
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {description && <p className="max-w-sm text-sm text-[#a291bd]">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-primary mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
