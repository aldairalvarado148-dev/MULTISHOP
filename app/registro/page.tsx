import Link from "next/link";
import { redirect } from "next/navigation";
import RegisterForm from "@/components/auth/RegisterForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (session.userId) redirect(params.next || "/cuenta");

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-black tracking-tight text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-[#a291bd]">
          Regístrate para comprar, recargar saldo y seguir tus pedidos.
        </p>
        <div className="mt-5">
          <RegisterForm next={params.next ?? "/cuenta"} />
        </div>
        <p className="mt-5 text-xs text-[#a291bd]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-[#c77dff] hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
