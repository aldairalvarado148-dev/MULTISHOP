import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSession } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export const metadata: Metadata = {
  title: "MULTISHOP · Tienda digital premium",
  description:
    "Compra diamantes, pases y membresías de Free Fire, además de Netflix, YouTube Premium y Spotify. Entrega rápida y pagos verificados.",
};

export const viewport: Viewport = {
  themeColor: "#05020a",
  width: "device-width",
  initialScale: 1,
};

async function loadCategories(): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data as Category[] | null) ?? [];
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, store, categories] = await Promise.all([
    getSession(),
    getStoreSettings(),
    loadCategories(),
  ]);

  return (
    <html lang="es">
      <body className="antialiased">
        <Header
          user={
            session.userId
              ? {
                  email: session.email,
                  fullName: session.profile?.full_name ?? null,
                  isAdmin: session.isAdmin,
                }
              : null
          }
          categories={categories}
          storeName={store.name}
        />
        <main className="min-h-[60vh]">{children}</main>
        <Footer categories={categories} storeName={store.name} />
      </body>
    </html>
  );
}
