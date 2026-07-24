import type { Metadata } from "next";
import Link from "next/link";
import styles from "./security.module.css";
import {
  permissionMatrix,
  securityArchitectureLines,
  securityLinks,
  securityProofItems,
  securitySections,
  securityStatusLabels,
  securityIntro,
} from "./security-content";

export const metadata: Metadata = {
  title: "Security architecture - KommuneFlow AI",
  description:
    "An evidence-backed overview of application access control, tenant isolation, AI review, public-demo restrictions and deployment boundaries.",
};

export default function SecurityPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Security navigation">
        <Link className={styles.brand} href="/">
          <Logo />
          <span>
            KommuneFlow <b>AI</b>
          </span>
        </Link>
        <Link className={styles.returnLink} href="/">
          Return to portfolio
        </Link>
      </nav>

      <section className={styles.hero} aria-labelledby="security-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Security and trust</p>
          <h1 id="security-title">Security architecture and trust boundaries</h1>
          <p className={styles.lede}>{securityIntro}</p>
          <div className={styles.statusGrid} aria-label="Security status labels">
            {securityStatusLabels.map((label) => (
              <span className={styles.statusPill} key={label}>
                {label}
              </span>
            ))}
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/#security">
              Return to security summary
            </Link>
            <Link className={styles.secondaryCta} href="/#evidence">
              Return to portfolio evidence
            </Link>
          </div>
        </div>

        <aside className={styles.heroCard} aria-label="Public trust note">
          <p className={styles.heroCardLabel}>Scope note</p>
          <strong>Public and synthetic by design.</strong>
          <p>
            The controls below document the current portfolio implementation.
            They are not a claim of independent certification or approval for
            real municipal data.
          </p>
        </aside>
      </section>

      <section className={styles.section} id="architecture" aria-labelledby="architecture-heading">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Architecture overview</p>
          <h2 id="architecture-heading">Layered trust boundaries</h2>
          <p>
            The browser reaches the gateway over HTTPS. The gateway routes to
            the web app and API, while application authorization, tenant scope
            and audit trails stay behind the private backend boundary.
          </p>
        </header>

        <figure className={styles.diagramFigure}>
          <div
            className={styles.diagram}
            role="img"
            aria-label="Browser over HTTPS to gateway, then Next.js web application and NestJS API with authentication and permission checks, municipality-scoped data access, audit and activity events, human-reviewed AI workflow, and PostgreSQL."
          >
            <pre aria-hidden="true">{securityArchitectureLines.join("\n")}</pre>
          </div>
          <figcaption>
            Only the gateway is externally reachable in the verified home
            deployment.
          </figcaption>
        </figure>
      </section>

      <section className={styles.section} id="proof" aria-labelledby="proof-heading">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Security proof</p>
          <h2 id="proof-heading">Four concise claims, each tied to implementation evidence.</h2>
        </header>
        <div className={styles.proofGrid}>
          {securityProofItems.map((item) => (
            <article className={styles.proofCard} key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <p className={styles.evidenceLabel}>{item.evidence}</p>
            </article>
          ))}
        </div>
      </section>

      {securitySections.map((section) => (
        <section
          className={styles.section}
          id={section.id}
          aria-labelledby={`${section.id}-heading`}
          key={section.id}
        >
          <header className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{section.title}</p>
            <h2 id={`${section.id}-heading`}>{section.title}</h2>
            <p>{section.summary}</p>
          </header>
          <ul className={styles.bulletList}>
            {section.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <p className={styles.sourceLine}>
            {section.evidenceLabel}
            <br />
            {section.sourceLabel}
          </p>
        </section>
      ))}

      <section className={styles.section} id="permissions" aria-labelledby="permissions-heading">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Authorization matrix</p>
          <h2 id="permissions-heading">Compact role comparison</h2>
          <p>
            The values below mirror the current application permission model for
            the roles shown on the public security page.
          </p>
        </header>
        <div className={styles.tableWrap}>
          <table className={styles.matrix}>
            <caption>Role and permission comparison for the public security narrative</caption>
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Guest</th>
                <th scope="col">Case worker</th>
                <th scope="col">Department admin</th>
                <th scope="col">Auditor</th>
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) => (
                <tr key={row.capability}>
                  <th scope="row">{row.capability}</th>
                  <td data-label="Guest">{row.guest}</td>
                  <td data-label="Case worker">{row.caseWorker}</td>
                  <td data-label="Department admin">{row.departmentAdmin}</td>
                  <td data-label="Auditor">{row.auditor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.matrixNote}>
          These cells describe role permissions. Portfolio guest edits are
          still narrowed by backend checks to visitor-created and designated
          demo cases.
        </p>
      </section>

      <section className={styles.section} id="limits" aria-labelledby="limits-heading">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Known assurance limits</p>
          <h2 id="limits-heading">What this portfolio does not claim</h2>
        </header>
        <p className={styles.callout}>
          These controls demonstrate secure engineering practices. They do not
          replace an independent security review, legal assessment or production
          readiness process for a real municipality.
        </p>
        <ul className={styles.bulletList}>
          <li>Portfolio demonstration only.</li>
          <li>Synthetic data only.</li>
          <li>Mock AI in the public deployment.</li>
          <li>No independent penetration test.</li>
          <li>No formal compliance certification.</li>
          <li>Not approved for processing real municipal information.</li>
          <li>Shared guest environment.</li>
          <li>Public uploads intentionally disabled.</li>
          <li>Reset schedule is an operational control, not per-user isolation.</li>
        </ul>
      </section>

      <section className={styles.section} id="verification-links" aria-labelledby="verification-links-heading">
        <header className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Evidence links</p>
          <h2 id="verification-links-heading">Source and verification</h2>
          <p>
            These links point to the public repository and the documentation
            used to support the claims on this page.
          </p>
        </header>
        <div className={styles.linkGrid}>
          {securityLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                className={styles.linkCard}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{link.label}</span>
                <strong>{link.href}</strong>
              </a>
            ) : (
              <Link key={link.label} className={styles.linkCard} href={link.href}>
                <span>{link.label}</span>
                <strong>{link.href}</strong>
              </Link>
            ),
          )}
        </div>
      </section>
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
