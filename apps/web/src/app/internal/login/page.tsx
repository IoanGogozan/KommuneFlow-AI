import { InternalLoginForm } from "./ui/internal-login-form";

export default function InternalLoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">KommuneFlow AI</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Internal login
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use a seeded municipal employee account to access the case dashboard.
        </p>
        <InternalLoginForm />
      </section>
    </main>
  );
}
