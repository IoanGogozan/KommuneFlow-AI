import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EnterPortfolioDemoButton } from "@/components/enter-portfolio-demo-button";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "KommuneFlow AI — Municipal case management portfolio",
  description:
    "A working portfolio application for secure citizen intake, human-reviewed AI suggestions, and auditable municipal casework.",
};

const steps = [
  {
    title: "Citizen submits a request",
    text: "The citizen selects a municipality, describes the issue, optionally confirms an address, and attaches relevant documents.",
  },
  {
    title: "AI prepares a structured suggestion",
    text: "The application proposes category, urgency, department, summary, and any missing information.",
  },
  {
    title: "An employee reviews and processes the case",
    text: "The employee accepts or corrects the suggestion before any official case field changes.",
  },
] as const;

const proof = [
  {
    title: "Secure multi-tenant workflow",
    text: "Tenant isolation, server-side RBAC, private uploads, and audit logging protect each municipal workflow.",
  },
  {
    title: "Human-reviewed AI",
    text: "Schema-validated suggestions remain separate from official values until an authorised employee reviews them.",
  },
  {
    title: "Tested and deployable architecture",
    text: "PostgreSQL-backed API and browser tests support a Docker Compose, Caddy, and home-server deployment.",
  },
] as const;

export default function Home() {
  return (
    <main className={styles.shell}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link className={styles.brand} href="/">
          <Logo />
          <span>
            KommuneFlow <b>AI</b>
          </span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#workflow">Workflow</a>
          <a href="#engineering">Engineering</a>
          <a href="#evidence">Product evidence</a>
          <a
            href="https://github.com/IoanGogozan/KommuneFlow-AI"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Working portfolio demonstration</p>
          <h1 id="hero-title">
            Municipal case management, from citizen request to human-reviewed
            decision.
          </h1>
          <p className={styles.lede}>
            A working portfolio application demonstrating secure citizen
            intake, case handling, tenant isolation, auditability, and AI
            suggestions that require employee approval.
          </p>
          <div className={styles.heroActions}>
            <Link
              className={styles.primaryCta}
              href="/en?municipality=kristiansand&portfolio=1"
            >
              Try citizen flow
            </Link>
            <EnterPortfolioDemoButton className={styles.primaryCta} />
            <a
              className={styles.secondaryCta}
              href="https://github.com/IoanGogozan/KommuneFlow-AI"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source and architecture
            </a>
          </div>
          <p className={styles.accessNote}>
            <a href="#workflow">Read how it works</a>
          </p>
          <p className={styles.statusLine}>
            No account required <span aria-hidden="true">·</span> Synthetic data only{" "}
            <span aria-hidden="true">·</span> Guest sessions reset automatically
          </p>
        </div>
        <div className={styles.heroPrinciple}>
          <span>Product principle</span>
          <strong>AI suggests.</strong>
          <strong>People decide.</strong>
          <p>
            Suggestions never change official case values without human review.
          </p>
        </div>
      </section>

      <section className={styles.section} id="workflow">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Three-step product flow</p>
          <h2>One request. A clear, accountable path.</h2>
        </header>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.title}>
              <span aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.traceability}>
          Important actions remain traceable throughout the workflow.
        </p>
      </section>

      <section className={`${styles.section} ${styles.proofSection}`} id="engineering">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Engineering proof</p>
          <h2>Capabilities designed around trust.</h2>
        </header>
        <div className={styles.proofGrid}>
          {proof.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.evidenceSection}`} id="evidence">
        <div className={styles.evidenceCopy}>
          <p className={styles.eyebrow}>Real application evidence</p>
          <h2>The citizen intake, as implemented.</h2>
          <p>
            This screenshot comes from the working Norwegian citizen flow, not
            a decorative dashboard mock-up.
          </p>
          <p className={styles.scope}>
            Functional portfolio demonstration with synthetic data. Not
            approved for real municipal use.
          </p>
        </div>
        <figure>
          <Image
            src="/screenshots/citizen-intake-preview.png"
            width={1440}
            height={850}
            sizes="(max-width: 800px) 100vw, 58vw"
            alt="Norwegian KommuneFlow citizen intake showing contact and request fields"
          />
          <figcaption>Norwegian citizen intake using synthetic data.</figcaption>
        </figure>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}>
          <Logo />
          <span>
            KommuneFlow <b>AI</b>
          </span>
        </div>
        <p>Portfolio demonstration by Norvix AS.</p>
        <a
          href="https://github.com/IoanGogozan/KommuneFlow-AI"
          target="_blank"
          rel="noreferrer"
        >
          View source on GitHub
        </a>
      </footer>
    </main>
  );
}

function Logo() {
  return (
    <span className={styles.logo} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
