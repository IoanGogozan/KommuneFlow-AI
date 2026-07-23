import Link from "next/link";
import { notFound } from "next/navigation";
import { IntakeForm } from "./ui/intake-form";
import { dictionaries, isLocale } from "@/lib/i18n";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    municipality?: string;
  }>;
};

export default async function IntakePage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const { municipality } = await searchParams;

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

        <section className="mx-auto w-full max-w-3xl flex-1 py-8">
          <div>
            <IntakeForm
              dictionary={dictionary}
              locale={localeParam}
              initialTenantSlug={municipality}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
