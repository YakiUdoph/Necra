import Link from "next/link";

import "./atelier.css";

const workflow = [
  {
    index: "01",
    label: "Preserve the agreement",
    detail: "Keep the exact source, version, and provenance that define the baseline.",
    tag: "Source",
  },
  {
    index: "02",
    label: "Record what changed",
    detail:
      "Capture later instructions separately—without turning a request into approval.",
    tag: "Request",
  },
  {
    index: "03",
    label: "Check the evidence",
    detail: "Compare selected versions and inspect what the available passages support.",
    tag: "Reality check",
  },
  {
    index: "04",
    label: "Decide explicitly",
    detail: "Let an authorized person record the outcome and preserve the audit trail.",
    tag: "Decision",
  },
] as const;

export default function HomePage() {
  return (
    <div className="atelier">
      <header className="atelier-header">
        <Link className="atelier-wordmark" href="/">
          <span className="atelier-wordmark-mark" aria-hidden="true">
            N
          </span>
          <span>NECRA</span>
        </Link>
        <nav className="atelier-nav" aria-label="Primary navigation">
          <a href="#method">Method</a>
          <a href="#workspace">Workspace</a>
          <Link href="/sign-in">Sign in</Link>
        </nav>
        <Link className="atelier-nav-cta" href="/sign-in">
          Open Necra <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main id="main-content">
        <section className="atelier-hero" aria-labelledby="atelier-title">
          <div className="atelier-hero-grid" aria-hidden="true" />
          <div className="atelier-hero-copy">
            <p className="atelier-kicker">
              <span>Agreement change review</span>
              <span>01 / Evidence first</span>
            </p>
            <h1 id="atelier-title" aria-label="Know what changed. Know who decided.">
              <span className="atelier-title-line atelier-title-line-one">Know what</span>
              <span className="atelier-title-line atelier-title-line-two">changed.</span>
              <span className="atelier-title-line atelier-title-line-three">
                Know who <strong>decided.</strong>
              </span>
            </h1>
            <div className="atelier-hero-support">
              <p>
                Necra connects the original agreement, later instructions, evidence-backed
                findings, and explicit human decisions in one traceable record.
              </p>
              <div className="atelier-hero-actions">
                <Link className="atelier-button" href="/sign-in">
                  Enter the workspace <span aria-hidden="true">→</span>
                </Link>
                <a className="atelier-text-link" href="#method">
                  Follow the record <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
          </div>

          <div className="atelier-record-engine" aria-hidden="true">
            <div className="atelier-engine-orbit atelier-engine-orbit-one" />
            <div className="atelier-engine-orbit atelier-engine-orbit-two" />
            <div className="atelier-engine-core">
              <span>NECRA / 001</span>
              <strong>Agreement</strong>
              <i />
              <i />
              <i />
              <small>Original version preserved</small>
            </div>
            <div className="atelier-engine-card atelier-engine-card-request">
              <span>02 / Request</span>Later instruction
            </div>
            <div className="atelier-engine-card atelier-engine-card-finding">
              <span>03 / Finding</span>Evidence linked
            </div>
            <div className="atelier-engine-card atelier-engine-card-decision">
              <span>04 / Decision</span>Human recorded
            </div>
            <div className="atelier-engine-scan" />
          </div>

          <div className="atelier-hero-footer">
            <span>Evidence before inference</span>
            <span>A request is not an approval</span>
            <span>01 / 03</span>
          </div>
        </section>

        <section className="atelier-principle" aria-label="Necra principle">
          <p>Separate the signal.</p>
          <div>
            <span>A request</span>
            <strong>≠</strong>
            <span>An approval</span>
          </div>
          <div>
            <span>A finding</span>
            <strong>≠</strong>
            <span>A decision</span>
          </div>
        </section>

        <section className="atelier-method" id="method" aria-labelledby="method-title">
          <div className="atelier-section-index">
            <span>02 / The method</span>
            <span>From source to decision</span>
          </div>
          <div className="atelier-method-heading">
            <h2 id="method-title">
              One record.<span>Four distinct moments.</span>
            </h2>
            <p>
              Every step keeps its own meaning. Evidence stays evidence. Automated output
              stays separate from the people authorized to decide.
            </p>
          </div>
          <ol className="atelier-workflow">
            {workflow.map((item) => (
              <li key={item.index}>
                <span className="atelier-workflow-index">{item.index}</span>
                <div>
                  <span className="atelier-workflow-tag">{item.tag}</span>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                </div>
                <span className="atelier-workflow-arrow" aria-hidden="true">
                  ↗
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="atelier-workspace"
          id="workspace"
          aria-labelledby="workspace-title"
        >
          <div className="atelier-section-index atelier-section-index-light">
            <span>03 / Inside Necra</span>
            <span>Professional evidence workspace</span>
          </div>
          <div className="atelier-workspace-layout">
            <div className="atelier-workspace-copy">
              <h2 id="workspace-title">
                Serious records.<span>Clear next steps.</span>
              </h2>
              <p>
                Work through agreements, requests, Reality Checks, decisions, and replay
                without losing the exact versions or blurring human authority.
              </p>
              <Link className="atelier-button atelier-button-light" href="/sign-in">
                Open your workspace <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div
              className="atelier-workspace-preview"
              aria-label="Necra workflow preview"
              role="img"
            >
              <div className="atelier-preview-rail">
                <span className="atelier-preview-logo">N</span>
                <i className="atelier-preview-active" />
                <i />
                <i />
                <i />
              </div>
              <div className="atelier-preview-canvas">
                <span className="atelier-preview-label">Project / Reality Check</span>
                <h3>Website redesign agreement</h3>
                <div className="atelier-preview-columns">
                  <article>
                    <span>Agreement / v1</span>
                    <strong>Original scope</strong>
                    <i />
                    <i />
                    <i />
                  </article>
                  <article>
                    <span>Later instruction / v1</span>
                    <strong>Requested change</strong>
                    <i />
                    <i />
                    <i />
                  </article>
                </div>
                <div className="atelier-preview-status">
                  <span>Evidence linked</span>
                  <strong>Human review required</strong>
                </div>
                <p className="atelier-preview-disclosure">
                  Illustrative interface — no customer data or provider result is shown.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="atelier-final" aria-labelledby="final-title">
          <p>Make the record clear</p>
          <h2 id="final-title">
            When the scope moves,<span>keep the truth in view.</span>
          </h2>
          <Link className="atelier-button" href="/sign-in">
            Begin with Necra <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <footer className="atelier-footer">
        <Link className="atelier-wordmark" href="/">
          <span className="atelier-wordmark-mark" aria-hidden="true">
            N
          </span>
          <span>NECRA</span>
        </Link>
        <p>Evidence before inference. Decisions by people.</p>
        <Link href="/sign-in">Sign in ↗</Link>
      </footer>
    </div>
  );
}
