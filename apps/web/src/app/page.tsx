import type { Metadata } from "next";
import Link from "next/link";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "KommuneFlow AI — Smarter municipal casework",
  description:
    "A realistic portfolio demo for secure citizen intake, human-reviewed AI triage, municipal casework, privacy, and operational insight.",
};

const features = [
  {
    icon: "inbox",
    title: "One structured intake",
    text: "Citizens submit requests, validate addresses through Kartverket, attach documents, and follow progress with a secure reference.",
  },
  {
    icon: "spark",
    title: "AI that assists — never decides",
    text: "The system suggests category, urgency, summary, and department. A caseworker reviews every suggestion before it becomes official.",
  },
  {
    icon: "route",
    title: "Cases reach the right team",
    text: "Configurable routing rules and department queues turn fragmented enquiries into a visible, accountable workflow.",
  },
  {
    icon: "shield",
    title: "Privacy built into the workflow",
    text: "Tenant isolation, role-based access, audit trails, retention controls, and privacy operations are part of the product — not an appendix.",
  },
  {
    icon: "chart",
    title: "Operational insight",
    text: "Leaders can see volume, response flow, AI review quality, estimated time saved, and population context without exposing citizen identities.",
  },
  {
    icon: "globe",
    title: "Made for Norwegian services",
    text: "Bilingual citizen journeys, Norwegian municipal structures, and integrations with Kartverket and SSB make the demo feel grounded.",
  },
] as const;

const steps = [
  ["01", "A citizen explains the need", "A guided form captures contact details, location, context, and supporting documents in Norwegian or English."],
  ["02", "AI prepares the first assessment", "A structured suggestion highlights category, urgency, missing information, and the most relevant department."],
  ["03", "A caseworker stays in control", "The employee reviews, corrects, or approves the suggestion before updating the official case and workflow."],
  ["04", "Every important action is traceable", "Status changes, document access, AI reviews, and privacy actions are recorded for accountability."],
] as const;

export default function Home() {
  return (
    <main className={styles.shell}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link className={styles.brand} href="/">
          <Logo />
          <span>KommuneFlow <b>AI</b></span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#product">Product</a>
          <a href="#workflow">How it works</a>
          <a href="#scope">Demo scope</a>
        </div>
        <div className={styles.navActions}>
          <span className={styles.live}><i /> Live portfolio demo</span>
          <a className={styles.sourceLink} href="https://github.com/IoanGogozan/KommuneFlow-AI" target="_blank" rel="noreferrer">
            Source <Icon name="external" />
          </a>
          <Link className={styles.navCta} href="/nb" prefetch={false}>Open demo <Icon name="arrow" /></Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><span>Municipal casework, reimagined</span> Portfolio project</p>
          <h1>From citizen request<br />to the right desk.</h1>
          <p className={styles.lede}>
            KommuneFlow AI brings intake, human-reviewed AI triage, case handling,
            privacy, and operational insight into one coherent municipal workflow.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/nb" prefetch={false}>Explore the citizen flow <Icon name="arrow" /></Link>
            <Link className={styles.secondaryCta} href="/internal/login" prefetch={false}>Open employee workspace</Link>
          </div>
          <div className={styles.trustLine}>
            <span><Icon name="check" /> Synthetic data only</span>
            <span><Icon name="check" /> No automatic decisions</span>
            <span><Icon name="check" /> Human in the loop</span>
          </div>
        </div>

        <div className={styles.productPreview} aria-label="Case workflow preview">
          <div className={styles.previewTop}>
            <div className={styles.previewBrand}><Logo /><span>KommuneFlow</span></div>
            <div className={styles.previewUser}><span>MA</span><i /></div>
          </div>
          <div className={styles.previewBody}>
            <aside className={styles.previewNav}>
              <span className={styles.activeNav}><Icon name="grid" /> Overview</span>
              <span><Icon name="inbox" /> Cases <b>12</b></span>
              <span><Icon name="chart" /> Analytics</span>
              <span><Icon name="shield" /> Audit log</span>
            </aside>
            <div className={styles.previewMain}>
              <div className={styles.previewHeading}>
                <div><small>CASE QUEUE</small><h3>Good morning, Maria</h3></div>
                <button>+ New case</button>
              </div>
              <div className={styles.metrics}>
                <Metric value="22" label="Open cases" color="blue" />
                <Metric value="7" label="Awaiting review" color="yellow" />
                <Metric value="86%" label="Routed correctly" color="green" />
              </div>
              <div className={styles.casePanel}>
                <div className={styles.casePanelHead}><strong>Needs your attention</strong><span>View all</span></div>
                <CaseRow icon="road" title="Streetlight not working" reference="KF-2026-0142" status="AI triage ready" tone="green" />
                <CaseRow icon="home" title="Question about building permit" reference="KF-2026-0138" status="Missing information" tone="yellow" />
                <CaseRow icon="tree" title="Fallen tree near footpath" reference="KF-2026-0131" status="High priority" tone="red" />
              </div>
            </div>
          </div>
          <div className={styles.aiCard}>
            <span className={styles.aiIcon}><Icon name="spark" /></span>
            <div><small>AI SUGGESTION · READY FOR REVIEW</small><strong>Technical services · High confidence</strong></div>
            <span className={styles.confidence}>94%</span>
          </div>
        </div>
      </section>

      <section className={styles.signalStrip} aria-label="Product principles">
        <span>Citizen-first intake</span><i />
        <span>Human-reviewed AI</span><i />
        <span>Tenant-isolated data</span><i />
        <span>Auditable by design</span>
      </section>

      <section className={`${styles.section} ${styles.productSection}`} id="product">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>One connected service</p>
          <h2>Less time sorting.<br />More time solving.</h2>
          <p>Every part of the workflow is designed to reduce administrative friction while keeping responsibility with municipal employees.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature, index) => (
            <article className={styles.featureCard} key={feature.title}>
              <span className={styles.featureNumber}>0{index + 1}</span>
              <Icon name={feature.icon} />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.workflowSection}`} id="workflow">
        <div className={styles.workflowIntro}>
          <p className={styles.kicker}>A complete case journey</p>
          <h2>One request.<br />A visible path forward.</h2>
          <p>Follow a realistic flow from a citizen&apos;s first message to a reviewed, routed, and traceable municipal case.</p>
          <Link className={styles.darkCta} href="/nb" prefetch={false}>Start the walkthrough <Icon name="arrow" /></Link>
        </div>
        <div className={styles.steps}>
          {steps.map(([number, title, text]) => (
            <article className={styles.step} key={number}>
              <span>{number}</span><div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.governanceSection}`}>
        <div className={styles.governanceVisual}>
          <div className={styles.orbit}><span><Icon name="spark" /></span><i /><i /><i /></div>
          <div className={styles.reviewCard}><small>AI OUTPUT</small><strong>Suggested: Roads &amp; mobility</strong><p>Confidence 0.92 · 2 signals found</p></div>
          <div className={styles.approvalCard}><Icon name="user" /><div><small>HUMAN REVIEW</small><strong>Approved by caseworker</strong></div><Icon name="check" /></div>
        </div>
        <div className={styles.governanceCopy}>
          <p className={styles.kicker}>Responsible AI by design</p>
          <h2>The model suggests.<br />People decide.</h2>
          <p>KommuneFlow separates AI output from official case values. Suggestions are structured, validated, versioned, and stored for review — but cannot close, reject, or silently reclassify a case.</p>
          <ul>
            <li><Icon name="check" /> Every suggestion requires human review</li>
            <li><Icon name="check" /> Corrections become measurable quality signals</li>
            <li><Icon name="check" /> Decisions and model context remain auditable</li>
          </ul>
        </div>
      </section>

      <section className={`${styles.section} ${styles.scopeSection}`} id="scope">
        <div className={styles.scopeIntro}>
          <p className={styles.kicker}>Built to feel real — scoped as a demo</p>
          <h2>Production-minded.<br />Honest about its limits.</h2>
          <p>This is a functional, access-controlled portfolio system with realistic infrastructure and synthetic data. It demonstrates product and engineering decisions; it is not certified for real municipal use.</p>
        </div>
        <div className={styles.scopeCards}>
          <div className={styles.scopeCard}><span>Implemented in the demo</span><ul>
            <li><Icon name="check" /> End-to-end citizen and employee flows</li>
            <li><Icon name="check" /> Multi-tenant RBAC and audit evidence</li>
            <li><Icon name="check" /> PostgreSQL, private uploads, privacy controls</li>
            <li><Icon name="check" /> Mock/OpenAI provider abstraction</li>
            <li><Icon name="check" /> Automated API, security, and browser tests</li>
          </ul></div>
          <div className={`${styles.scopeCard} ${styles.futureCard}`}><span>Required before real-world use</span><ul>
            <li>Formal security and privacy assessment</li>
            <li>Municipal identity provider and MFA</li>
            <li>Malware scanning and durable object storage</li>
            <li>Archive and records-management integration</li>
            <li>Operational ownership, SLAs, and monitoring</li>
          </ul></div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div><p className={styles.kicker}>See the whole flow</p><h2>Submit a request.<br />Then work the case.</h2></div>
        <div className={styles.finalActions}>
          <Link className={styles.lightCta} href="/nb" prefetch={false}>Open citizen portal <Icon name="arrow" /></Link>
          <Link className={styles.outlineCta} href="/internal/login" prefetch={false}>Employee sign in</Link>
          <p>Synthetic data only · Portfolio demonstration · No real citizen data</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}><Logo /><span>KommuneFlow <b>AI</b></span></div>
        <p>A municipal service workflow demonstration by Norvix AS.</p>
        <div><a href="https://github.com/IoanGogozan/KommuneFlow-AI" target="_blank" rel="noreferrer">View source <Icon name="external" /></a><Link href="/nb" prefetch={false}>Open demo <Icon name="arrow" /></Link></div>
      </footer>
    </main>
  );
}

function Logo() {
  return <span className={styles.logo} aria-hidden="true"><i /><i /><i /></span>;
}

function Metric({ value, label, color }: { value: string; label: string; color: string }) {
  return <div className={styles.metric}><i data-color={color} /><div><strong>{value}</strong><span>{label}</span></div></div>;
}

function CaseRow({ icon, title, reference, status, tone }: { icon: string; title: string; reference: string; status: string; tone: string }) {
  return <div className={styles.caseRow}><span className={styles.caseIcon}><Icon name={icon} /></span><div><strong>{title}</strong><small>{reference}</small></div><span className={styles.status} data-tone={tone}>{status}</span><Icon name="chevron" /></div>;
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    external: <><path d="M14 5h5v5"/><path d="m10 14 9-9"/><path d="M19 14v5H5V5h5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    grid: <><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></>,
    inbox: <><path d="M4 5h16v14H4z"/><path d="M4 14h5l2 2h2l2-2h5"/></>,
    chart: <><path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/></>,
    shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-5"/></>,
    spark: <><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></>,
    route: <><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h4a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H9a3 3 0 0 0-3 3v1"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
    road: <><path d="M9 20 11 4M15 20 13 4M12 7v3M12 14v3"/></>,
    home: <><path d="m4 11 8-7 8 7"/><path d="M6 10v10h12V10M10 20v-6h4v6"/></>,
    tree: <><path d="M12 20v-5"/><path d="M7 15h10l-3-4h2l-4-7-4 7h2z"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.grid}</svg>;
}
