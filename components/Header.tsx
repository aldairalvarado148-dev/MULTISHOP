"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

type HeaderUser = { email: string | null; fullName: string | null; isAdmin: boolean } | null;

const NAV = [
  { href: "/", label: "INICIO", icon: "home" },
  { href: "/compras", label: "MIS COMPRAS", icon: "bag" },
  { href: "/saldo", label: "SALDO", icon: "wallet" },
  { href: "/carrito", label: "CARRITO", icon: "cart" },
  { href: "/cuenta", label: "CUENTA", icon: "user" },
] as const;

function Icon({ name, className }: { name: string; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...common} />,
    bag: (
      <>
        <path d="M6 8h12l-1 12H7z" {...common} />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" {...common} />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="3" {...common} />
        <path d="M3 10h18" {...common} />
        <circle cx="17" cy="14.5" r="1.3" {...common} />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" {...common} />
        <circle cx="9.5" cy="20" r="1.4" {...common} />
        <circle cx="18" cy="20" r="1.4" {...common} />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.6" {...common} />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...common} />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" {...common} />
        <path d="m16 16 4 4" {...common} />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" {...common} />,
    close: <path d="M6 6l12 12M18 6 6 18" {...common} />,
    shield: (
      <>
        <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" {...common} />
        <path d="m9 12 2 2 4-4" {...common} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  );
}

export default function Header({
  user,
  categories,
  storeName,
}: {
  user: HeaderUser;
  categories: Category[];
  storeName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;
    if (!user) {
      setCartCount(0);
      return;
    }
    fetch("/api/cart", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.items) return;
        setCartCount(
          data.items.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0),
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    router.push(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[rgba(176,38,255,0.18)] bg-[rgba(5,2,10,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#b026ff] to-[#5b21b6] shadow-[0_0_24px_-6px_rgba(176,38,255,0.9)]">
              <span className="text-sm font-black text-white">M</span>
            </span>
            <span className="neon-text text-lg font-black tracking-[0.16em] sm:text-xl">
              {storeName || "MULTISHOP"}
            </span>
          </Link>

          <form onSubmit={submitSearch} className="relative ml-2 hidden flex-1 md:block">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b86bd]"
            />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="input pl-9"
              placeholder="Buscar diamantes, Netflix, Spotify…"
              aria-label="Buscar productos"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            {user?.isAdmin && (
              <Link href="/admin" className="btn btn-ghost hidden sm:inline-flex">
                <Icon name="shield" className="h-4 w-4" />
                ADMIN
              </Link>
            )}
            {!user ? (
              <Link href="/login" className="btn btn-primary">
                Entrar
              </Link>
            ) : (
              <Link
                href="/cuenta"
                className="hidden max-w-[170px] truncate text-xs text-[#bda9dd] sm:block"
              >
                {user.fullName || user.email}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="btn btn-ghost px-2.5 md:hidden"
              aria-label="Abrir menú"
              aria-expanded={open}
            >
              <Icon name={open ? "close" : "menu"} />
            </button>
          </div>
        </div>

        {/* Navegación principal: los 5 botones */}
        <nav className="mx-auto hidden max-w-7xl gap-1.5 px-4 pb-3 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[0.72rem] font-bold tracking-[0.12em] transition",
                isActive(item.href)
                  ? "border-[#b026ff]/60 bg-[#b026ff]/15 text-white shadow-[0_0_22px_-8px_rgba(176,38,255,0.9)]"
                  : "border-transparent text-[#b6a3d4] hover:border-[#b026ff]/30 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
              {item.href === "/carrito" && cartCount > 0 && (
                <span className="ml-0.5 rounded-full bg-[#b026ff] px-1.5 py-0.5 text-[0.6rem] font-black text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          ))}

          <span className="mx-1 h-8 w-px self-center bg-[rgba(176,38,255,0.25)]" />

          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className={cn(
                "rounded-xl px-3 py-2 text-[0.72rem] font-bold tracking-[0.12em] transition",
                pathname === `/categoria/${cat.slug}`
                  ? "bg-[#b026ff]/15 text-white"
                  : "text-[#b6a3d4] hover:bg-white/5 hover:text-white",
              )}
            >
              {cat.icon ? `${cat.icon} ` : ""}
              {cat.name}
            </Link>
          ))}
        </nav>

        {open && (
          <div className="border-t border-[rgba(176,38,255,0.18)] bg-[rgba(8,4,16,0.98)] px-4 py-3 md:hidden">
            <form onSubmit={submitSearch} className="mb-3">
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="input"
                placeholder="Buscar productos…"
                aria-label="Buscar productos"
              />
            </form>
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[0.72rem] font-bold tracking-wide",
                    isActive(item.href)
                      ? "border-[#b026ff]/60 bg-[#b026ff]/15 text-white"
                      : "border-white/10 text-[#c3b1de]",
                  )}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categoria/${cat.slug}`}
                  className="rounded-xl border border-[#b026ff]/25 px-3 py-2 text-[0.72rem] font-bold tracking-wide text-[#d9c8f5]"
                >
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </Link>
              ))}
            </div>
            {user?.isAdmin && (
              <Link href="/admin" className="btn btn-ghost mt-3 w-full">
                <Icon name="shield" className="h-4 w-4" />
                PANEL ADMIN
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Barra inferior móvil con los 5 accesos */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(176,38,255,0.22)] bg-[rgba(6,3,12,0.96)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[0.58rem] font-bold tracking-[0.06em] transition",
                isActive(item.href) ? "text-[#c77dff]" : "text-[#8d7aa9]",
              )}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
              {item.href === "/carrito" && cartCount > 0 && (
                <span className="absolute right-[18%] top-1.5 rounded-full bg-[#b026ff] px-1 text-[0.55rem] font-black text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
