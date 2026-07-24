import type { Metadata } from "next";
import Link from "next/link";
import { EnterPortfolioDemoButton } from "@/components/enter-portfolio-demo-button";
import styles from "../landing.module.css";

export const metadata: Metadata = {
  title: "Portfolio demo — KommuneFlow AI",
  description: "Choose a public KommuneFlow AI portfolio journey.",
};

const flows = [
  {
    title: "Citizen experience",
    description: "Submit and track a synthetic municipal request.",
    action: "Try citizen flow",
    href: "/en?municipality=kristiansand&portfolio=1",
  },
] as const;

export default function DemoPage() {
  return (
    <main className={`${styles.shell} ${styles.demoShell}`}>
      <section className={styles.demoPage} aria-labelledby="demo-title">
        <p className={styles.eyebrow}>Public portfolio demo</p>
        <h1 id="demo-title">Choose a product journey</h1>
        <p className={styles.demoIntro}>
          No account is required. All information and workflows in this
          demonstration are synthetic.
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
              >
                {flow.action}
              </Link>
            </article>
          ))}
          <article className={styles.flowCard}>
            <h2>Employee experience</h2>
            <p>
              Review cases, inspect AI suggestions and update a synthetic
              workflow.
            </p>
            <EnterPortfolioDemoButton
              className={styles.primaryCta}
              idleLabel="Enter employee demo"
            />
          </article>
          <article className={styles.flowCard}>
            <h2>Technical review</h2>
            <p>Inspect the source, architecture, tests and security controls.</p>
            <a
              className={styles.primaryCta}
              href="https://github.com/IoanGogozan/KommuneFlow-AI"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source and architecture
            </a>
          </article>
        </div>
        <Link className={styles.backLink} href="/">
          Back to portfolio overview
        </Link>
      </section>
    </main>
  );
}
