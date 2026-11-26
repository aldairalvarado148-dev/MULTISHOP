import { NextResponse, type NextRequest } from "next/server";

/**
 * Bloqueo de la tienda en modo mantenimiento.
 * Las rutas administrativas, de autenticación y la propia pantalla de
 * mantenimiento quedan siempre accesibles.
 */
const BYPASS = ["/admin", "/login", "/registro", "/recuperar", "/auth", "/mantenimiento", "/api"];

let cached: { enabled: boolean; at: number } | null = null;
const TTL = 15000;

async function isMaintenanceEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  if (cached && Date.now() - cached.at < TTL) return cached.enabled;

  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/settings?select=value&key=eq.maintenance`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ value?: { enabled?: boolean } }>;
    const enabled = Boolean(rows?.[0]?.value?.enabled);
    cached = { enabled, at: Date.now() };
    return enabled;
  } catch {
    // Si no se puede consultar, la tienda sigue operativa: los endpoints de
    // escritura validan el mantenimiento directamente en el servidor.
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (BYPASS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }
  if (!(await isMaintenanceEnabled())) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/mantenimiento";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|css|js|woff2?)$).*)",
  ],
};
