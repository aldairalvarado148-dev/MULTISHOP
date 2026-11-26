import Link from "next/link";
import { isSupabaseConfigured, missingEnv } from "@/lib/env";
import { isSchemaReady } from "@/lib/schema-status";

export default async function SetupNotice() {
  if (!isSupabaseConfigured()) {
    const missing = missingEnv();

    return (
      <div className="mx-auto mt-6 max-w-5xl px-4">
        <div className="card border-[#b026ff]/40 p-5 glow-ring">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">Configuración pendiente</span>
            <span className="text-xs text-[#a291bd]">
              La tienda aún no está conectada a Supabase.
            </span>
          </div>
          <h2 className="mt-3 text-lg font-bold text-white">
            Conecta tu base de datos para activar MULTISHOP
          </h2>
          <p className="mt-1 text-sm text-[#bda9dd]">
            Ve a <strong className="text-white">Settings → Connect Supabase</strong> o define estas
            variables en <strong className="text-white">Settings → Environment variables</strong>:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missing.map((name) => (
              <li
                key={name}
                className="rounded-lg border border-[#b026ff]/30 bg-black/40 px-2 py-1 font-mono text-[0.7rem] text-[#dcbaff]"
              >
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-[#bda9dd]">
            Después ejecuta el archivo <code className="text-[#dcbaff]">supabase/schema.sql</code> en
            el SQL Editor de Supabase para crear las tablas, las políticas RLS y las dos categorías
            iniciales.
          </p>
          <Link href="/configuracion" className="btn btn-primary mt-4 w-fit">
            Ver guía de conexión
          </Link>
        </div>
      </div>
    );
  }

  const schemaReady = await isSchemaReady();
  if (schemaReady) return null;

  return (
    <div className="mx-auto mt-6 max-w-5xl px-4">
      <div className="card border-[#b026ff]/40 p-5 glow-ring">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge">Falta un paso</span>
          <span className="text-xs text-[#a291bd]">
            Supabase está conectado, pero las tablas todavía no existen.
          </span>
        </div>
        <h2 className="mt-3 text-lg font-bold text-white">Ejecuta el esquema de la base de datos</h2>
        <p className="mt-1 text-sm text-[#bda9dd]">
          Abre <strong className="text-white">Supabase → SQL Editor</strong>, pega el contenido de{" "}
          <code className="text-[#dcbaff]">supabase/schema.sql</code> y ejecútalo una sola vez. Ese
          archivo crea las tablas, las políticas RLS, los buckets de imágenes y las categorías{" "}
          <strong className="text-white">FREE FIRE</strong> y{" "}
          <strong className="text-white">STREAMING</strong> con sus subcategorías.
        </p>
        <p className="mt-2 text-sm text-[#bda9dd]">
          En cuanto termine, recarga esta página: el catálogo, el panel administrador, el carrito y
          los pedidos empezarán a funcionar con datos reales.
        </p>
      </div>
    </div>
  );
}
