import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (session.userId) redirect(params.next || "/cuenta");

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-black tracking-tight text-white">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-[#a291bd]">
          Accede para ver tus compras, saldo y notificaciones.
        </p>

        {params.error && (
          <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {params.error}
          </p>
        )}

        <div className="mt-5">
          <LoginForm next={params.next ?? "/cuenta"} />
        </div>

        <div className="mt-5 flex flex-col gap-2 text-xs text-[#a291bd]">
          <Link href="/recuperar" className="text-[#c77dff] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
          <span>
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-[#c77dff] hover:underline">
              Regístrate gratis
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
