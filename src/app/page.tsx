import Image from "next/image";
import Link from "next/link";
import "./atelier.css";

const trail = [
  {
    index: "01",
    label: "The agreement",
    detail: "Keep the original record intact.",
    kind: "source",
  },
  {
    index: "02",
    label: "The new request",
    detail: "Capture later instructions separately.",
    kind: "change",
  },
  {
    index: "03",
    label: "The Reality Check",
    detail: "Inspect findings against selected evidence.",
    kind: "review",
  },
  {
    index: "04",
    label: "The human decision",
    detail: "Record what an authorized person decided.",
    kind: "decision",
  },
] as const;

export default function HomePage() {
  return (
    <div className="atelier">
      <a className="atelier-skip" href="#main-content">
        Skip to content
      </a>
      <header className="atelier-header">
        <Link
          className="atelier-wordmark"
          href="/"
          aria-label="Necra home"
          style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}
        >
          <Image
            src="/necra-logo.png"
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            style={{ borderRadius: "9px", flexShrink: 0 }}
          />
          necra<span>.</span>
        </Link>
        <nav className="atelier-nav" aria-label="Primary navigation">
          <a href="#method">The method</a>
          <a href="#workspace">Inside Necra</a>
          <Link href="/sign-in">Sign in</Link>
        </nav>
        <Link className="atelier-nav-cta" href="/sign-up">
          Open your workspace <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main id="main-content">
        <section className="atelier-hero" aria-labelledby="atelier-title">
          <div className="atelier-orbit atelier-orbit-one" aria-hidden="true" />
          <div className="atelier-orbit atelier-orbit-two" aria-hidden="true" />
          <div className="atelier-hero-inner">
            <div className="atelier-hero-copy">
              <p className="atelier-kicker">
                <span className="atelier-kicker-line" /> THE RECORD, RECONSIDERED{" "}
                <span> / 001</span>
              </p>
              <h1 id="atelier-title">
                When the scope <span className="atelier-hero-italic">shifts,</span>
                <br />
                the truth <span className="atelier-outline">stays.</span>
              </h1>
              <p className="atelier-hero-description">
                Agreements change. Memories blur. Necra keeps the original evidence, later
                requests, findings, and human decisions in one traceable record.
              </p>
              <div className="atelier-hero-actions">
                <Link className="atelier-button" href="/sign-up">
                  Start with the evidence <span aria-hidden="true">↗</span>
                </Link>
                <a className="atelier-text-link" href="#method">
                  Discover the method <span aria-hidden="true">↓</span>
                </a>
              </div>
            </div>

            <div className="atelier-exhibit">
              <div className="atelier-exhibit-top">
                <span>EXHIBIT A / THE ORIGINAL</span>
                <span>NECRA — RECORD STUDY</span>
              </div>
              <div className="atelier-paper">
                <div className="atelier-paper-top">
                  <span>AGREEMENT / ORIGINAL</span>
                  <span className="atelier-paper-mark">01</span>
                </div>
                <p className="atelier-paper-title">What was actually agreed?</p>
                <div className="atelier-paper-lines" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="atelier-paper-note">
                  <span>↳</span> Original evidence is preserved, not silently rewritten.
                </div>
                <div className="atelier-paper-bottom">
                  <span>DOCUMENT RECORD</span>
                  <span>UNCHANGED SOURCE</span>
                </div>
              </div>
              <div className="atelier-exhibit-thread" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="atelier-change-slip">
                <span className="atelier-change-dot" />
                <div>
                  <small>LATER INSTRUCTION</small>
                  <strong>A new request enters the record.</strong>
                </div>
                <span className="atelier-slip-arrow">↗</span>
              </div>
              <div className="atelier-exhibit-caption">
                A conceptual product illustration — not a customer record or generated
                finding.
              </div>
            </div>
          </div>
          <div className="atelier-hero-bottom">
            <span>BUILT FOR CLARITY, NOT ASSUMPTIONS</span>
            <a href="#method">
              SCROLL TO FOLLOW THE EVIDENCE <span aria-hidden="true">↓</span>
            </a>
            <span>01 / 03</span>
          </div>
        </section>

        <section className="atelier-manifesto" aria-label="Necra principle">
          <span>THE DISTINCTION THAT MATTERS</span>
          <p>
            A request is <em>not</em> an approval.
            <br />A finding is <em>not</em> a decision.
          </p>
          <span className="atelier-manifesto-star" aria-hidden="true">
            ✳
          </span>
        </section>

        <section
          className="atelier-method"
          id="method"
          aria-labelledby="atelier-method-title"
        >
          <div className="atelier-section-top">
            <span>01 / THE METHOD</span>
            <span>FOLLOW THE RECORD, NOT THE NOISE</span>
          </div>
          <div className="atelier-method-intro">
            <h2 id="atelier-method-title">
              Clarity has
              <br />
              <em>a paper trail.</em>
            </h2>
            <p>
              Four distinct moments. One accountable history. Every stage remains visible
              without being mistaken for the next.
            </p>
          </div>
          <div className="atelier-trail">
            {trail.map((item) => (
              <article
                className={`atelier-trail-item atelier-trail-${item.kind}`}
                key={item.index}
              >
                <div className="atelier-trail-rail">
                  <span className="atelier-trail-node" />
                  <span className="atelier-trail-number">{item.index}</span>
                </div>
                <div className="atelier-trail-content">
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                </div>
                <span className="atelier-trail-symbol" aria-hidden="true">
                  ↗
                </span>
              </article>
            ))}
          </div>
        </section>

        <section
          className="atelier-workspace"
          id="workspace"
          aria-labelledby="atelier-workspace-title"
        >
          <div className="atelier-section-top">
            <span>02 / INSIDE NECRA</span>
            <span>THE WORKSPACE</span>
          </div>
          <div className="atelier-workspace-grid">
            <div className="atelier-workspace-copy">
              <p className="atelier-workspace-overline">EVIDENCE, WITH CONTEXT</p>
              <h2 id="atelier-workspace-title">
                Not another
                <br />
                <em>approval inbox.</em>
              </h2>
              <p>
                Inspect agreement versions, separate later instructions, review recorded
                Reality Check findings, and replay authorized decisions without rewriting
                history.
              </p>
              <Link href="/sign-up" className="atelier-inline-cta">
                Create your workspace <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="atelier-dossier">
              <div className="atelier-dossier-head">
                <span>CASE FILE / ANATOMY</span>
                <span>NO. 001</span>
              </div>
              <div className="atelier-dossier-title">
                One record.
                <br />
                <em>Every turning point.</em>
              </div>
              <div className="atelier-dossier-entry">
                <span>01 / SOURCE</span>
                <strong>Agreement history</strong>
                <span className="atelier-dossier-status">PRESERVED</span>
              </div>
              <div className="atelier-dossier-entry">
                <span>02 / CONTEXT</span>
                <strong>Later instructions</strong>
                <span className="atelier-dossier-status">SEPARATE</span>
              </div>
              <div className="atelier-dossier-entry">
                <span>03 / REVIEW</span>
                <strong>Reality Check</strong>
                <span className="atelier-dossier-status">EVIDENCE-BASED</span>
              </div>
              <div className="atelier-dossier-entry">
                <span>04 / AUTHORITY</span>
                <strong>Decision Replay</strong>
                <span className="atelier-dossier-status">HUMAN-LED</span>
              </div>
              <div className="atelier-dossier-foot">
                Illustrative information architecture. No customer data shown.
              </div>
            </div>
          </div>
        </section>

        <section className="atelier-final" aria-labelledby="atelier-final-title">
          <div className="atelier-final-glow" aria-hidden="true" />
          <p>03 / MAKE THE RECORD CLEAR</p>
          <h2 id="atelier-final-title">
            Know what changed.
            <br />
            <em>Know who decided.</em>
          </h2>
          <Link className="atelier-button atelier-final-button" href="/sign-up">
            Begin with Necra <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>
      <footer className="atelier-footer">
        <Link className="atelier-wordmark" href="/">
          necra<span>.</span>
        </Link>
        <p>Evidence before inference. Decisions by people.</p>
        <Link href="/sign-in">Sign in ↗</Link>
      </footer>
    </div>
  );
}
