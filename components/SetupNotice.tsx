import Link from "next/link";
import { isSupabaseConfigured, missingEnv } from "@/lib/env";

export default function SetupNotice() {
  if (isSupabaseConfigured()) return null;
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
