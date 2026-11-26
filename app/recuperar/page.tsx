import ForgotForm from "@/components/auth/ForgotForm";

export const dynamic = "force-dynamic";

export default function ForgotPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-black tracking-tight text-white">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-[#a291bd]">
          Te enviaremos un enlace seguro para crear una nueva contraseña.
        </p>
        <div className="mt-5">
          <ForgotForm />
        </div>
      </div>
    </div>
  );
}
