import type { Metadata } from "next";
import Link from "next/link";
import styles from "../landing.module.css";

export const metadata: Metadata = {
  title: "Demo access — KommuneFlow AI",
  description: "Choose a protected KommuneFlow AI demonstration flow.",
};

const flows = [
  {
    title: "Citizen flow",
    description:
      "Submit a synthetic municipal request, receive a case reference and access code, and check the case status.",
    action: "Open citizen demo",
    href: "/en",
  },
  {
    title: "Employee flow",
    description:
      "Sign in as a municipal employee, review cases, inspect AI suggestions, and update the workflow.",
    action: "Open employee workspace",
    href: "/internal/login",
  },
] as const;

export default function DemoPage() {
  return (
    <main className={`${styles.shell} ${styles.demoShell}`}>
      <section className={styles.demoPage} aria-labelledby="demo-title">
        <p className={styles.eyebrow}>Protected interactive demo</p>
        <h1 id="demo-title">Test the KommuneFlow demo</h1>
        <p className={styles.demoIntro}>
          The interactive application is protected to prevent automated abuse.
          Demo credentials are required before entering the citizen or employee
          flows.
        </p>
        <p className={styles.credentialNote}>
          Use the credentials provided with the portfolio link.
        </p>

        <div className={styles.flowGrid}>
          {flows.map((flow) => (
            <article className={styles.flowCard} key={flow.title}>
              <h2>{flow.title}</h2>
              <p>{flow.description}</p>
              <Link
                className={styles.primaryCta}
                href={flow.href}
                prefetch={false}
                target="_blank"
                rel="noopener noreferrer"
              >
                {flow.action}
              </Link>
            </article>
          ))}
        </div>

        <p className={styles.protectedLinkNote}>
          The protected application opens in a new tab. If you cancel
          authentication, close that tab and return here.
        </p>
        <Link className={styles.backLink} href="/">
          Back to portfolio overview
        </Link>
      </section>
    </main>
  );
}
