import { redirect } from "next/navigation";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login?next=/cuenta/restablecer");

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-black tracking-tight text-white">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-[#a291bd]">Elige una contraseña segura para tu cuenta.</p>
        <div className="mt-5">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
