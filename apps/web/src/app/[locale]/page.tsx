import Link from "next/link";
import { notFound } from "next/navigation";
import { IntakeForm } from "./ui/intake-form";
import { dictionaries, isLocale } from "@/lib/i18n";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function IntakePage({ params }: PageProps) {
  const { locale: localeParam } = await params;

  if (!isLocale(localeParam)) {
    notFound();
  }

  const dictionary = dictionaries[localeParam];
  const alternateLocale = localeParam === "nb" ? "en" : "nb";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">KommuneFlow AI</p>
            <p className="text-xs text-slate-500">Arendal Kommune</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{dictionary.languageLabel}</span>
            <Link
              href={`/${alternateLocale}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
            >
              {dictionary.switchLanguage}
            </Link>
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="pt-4">
            <p className="mb-4 inline-flex rounded-md bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900">
              {dictionary.badge}
            </p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
              {dictionary.title}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
              {dictionary.intro}
            </p>
          </div>

          <IntakeForm dictionary={dictionary} locale={localeParam} />
        </section>
      </div>
    </main>
  );
}
