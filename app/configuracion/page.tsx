import Link from "next/link";
import { hasServiceRole, isSupabaseConfigured, missingEnv } from "@/lib/env";
import { isSchemaReady } from "@/lib/schema-status";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configuración · MULTISHOP",
};

type Status = {
  label: string;
  ok: boolean;
  detail: string;
};

export default async function ConfiguracionPage() {
  const configured = isSupabaseConfigured();
  const serviceRole = hasServiceRole();
  const schemaReady = configured ? await isSchemaReady() : false;
  const missing = missingEnv();

  const statuses: Status[] = [
    {
      label: "Conexión con Supabase",
      ok: configured,
      detail: configured
        ? "URL y clave pública detectadas. La tienda puede leer el catálogo."
        : `Faltan: ${missing.filter((m) => m !== "SUPABASE_SERVICE_ROLE_KEY").join(", ")}`,
    },
    {
      label: "Clave de servicio (servidor)",
      ok: serviceRole,
      detail: serviceRole
        ? "Detectada. Pedidos, panel administrador, imágenes y copias de seguridad operativos."
        : "Falta SUPABASE_SERVICE_ROLE_KEY. Sin ella no se pueden crear pedidos ni guardar cambios del panel.",
    },
    {
      label: "Esquema de la base de datos",
      ok: schemaReady,
      detail: schemaReady
        ? "Tablas, políticas RLS y categorías iniciales aplicadas."
        : "Pendiente: ejecuta supabase/schema.sql en el SQL Editor de Supabase.",
    },
  ];

  const ready = configured && serviceRole && schemaReady;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="neon-text text-3xl font-black tracking-tight sm:text-4xl">
        Configuración de MULTISHOP
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-[#a291bd]">
        Estado real de la instalación, leído desde el servidor en cada visita. Aquí no se guardan
        datos ficticios: si algo aparece pendiente, la tienda todavía no puede operar esa función.
      </p>

      <div className="mt-8 space-y-3">
        {statuses.map((status) => (
          <div key={status.label} className="card flex flex-wrap items-start gap-3 p-4">
            <span
              className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                status.ok ? "bg-[#39ff14]" : "bg-[#ff3d71]"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{status.label}</span>
                <span className="badge">{status.ok ? "Listo" : "Pendiente"}</span>
              </div>
              <p className="mt-1 text-sm text-[#a291bd]">{status.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {ready ? (
        <div className="card mt-8 border-[#39ff14]/40 p-5">
          <h2 className="text-lg font-bold text-white">Todo listo</h2>
          <p className="mt-2 text-sm text-[#a291bd]">
            La instalación está completa. Entra al panel administrador para cargar productos y
            revisar pedidos.
          </p>
          <Link href="/admin" className="btn btn-primary mt-4 inline-flex">
            Ir al panel administrador
          </Link>
        </div>
      ) : (
        <div className="card mt-8 p-5">
          <h2 className="text-lg font-bold text-white">Pasos para terminar</h2>
          <ol className="mt-4 space-y-5 text-sm text-[#c9bce0]">
            <li>
              <p className="font-semibold text-white">1. Aplicar el esquema en Supabase</p>
              <p className="mt-1 text-[#a291bd]">
                Abre tu proyecto en Supabase → <strong>SQL Editor</strong> → New query, pega el
                contenido completo de <code className="text-[#e0b3ff]">supabase/schema.sql</code> y
                ejecútalo una sola vez. Es idempotente: crea tablas, políticas RLS, buckets de
                imágenes y las categorías FREE FIRE y STREAMING con sus subcategorías.
              </p>
            </li>
            <li>
              <p className="font-semibold text-white">2. Añadir la clave de servicio</p>
              <p className="mt-1 text-[#a291bd]">
                Supabase → <strong>Project Settings</strong> → <strong>API</strong> → copia la clave{" "}
                <code className="text-[#e0b3ff]">service_role</code> y guárdala en AppJet, en{" "}
                <strong>Settings → Environment variables</strong>, con el nombre{" "}
                <code className="text-[#e0b3ff]">SUPABASE_SERVICE_ROLE_KEY</code>. Se usa solo en el
                servidor: nunca se envía al navegador.
              </p>
            </li>
            <li>
              <p className="font-semibold text-white">3. Crear tu cuenta y nombrarla administradora</p>
              <p className="mt-1 text-[#a291bd]">
                Regístrate en <Link href="/registro" className="text-[#c77dff] underline">/registro</Link>{" "}
                y luego ejecuta en el SQL Editor, con tu correo:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/50 p-3 text-xs text-[#e0b3ff]">
{`update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');`}
              </pre>
            </li>
          </ol>
        </div>
      )}

      <p className="mt-8 text-xs text-[#7c6b93]">
        Las claves privadas nunca se muestran en esta página ni se guardan en el navegador.
      </p>
    </div>
  );
}
