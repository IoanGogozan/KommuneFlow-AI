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

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#003b71] pb-6">
          <div>
            <p className="text-xl font-semibold text-[#003b71]">
              KommuneFlow AI
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
            <Link
              href="/internal"
              className="border-2 border-[#003b71] bg-white px-3 py-2 font-semibold text-[#003b71] hover:bg-[#eaf4fb]"
            >
              {dictionary.employeePortalLabel}
            </Link>
            <nav
              className="flex border-2 border-[#003b71] bg-white p-1"
              aria-label="Language"
            >
              <Link
                href="/nb"
                aria-current={localeParam === "nb" ? "page" : undefined}
                className={
                  localeParam === "nb"
                    ? "bg-[#003b71] px-3 py-1.5 text-sm font-semibold text-white"
                    : "px-3 py-1.5 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb]"
                }
              >
                Norsk
              </Link>
              <Link
                href="/en"
                aria-current={localeParam === "en" ? "page" : undefined}
                className={
                  localeParam === "en"
                    ? "bg-[#003b71] px-3 py-1.5 text-sm font-semibold text-white"
                    : "px-3 py-1.5 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb]"
                }
              >
                English
              </Link>
            </nav>
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="pt-3 lg:sticky lg:top-8">
            <p className="mb-4 inline-flex bg-[#eaf4fb] px-3 py-1 text-sm font-semibold text-[#003b71]">
              {dictionary.badge}
            </p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-normal text-[#003b71]">
              {dictionary.title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
              {dictionary.intro}
            </p>
          </div>

          <IntakeForm dictionary={dictionary} locale={localeParam} />
        </section>
      </div>
    </main>
  );
}
