const experiences = [
  {
    index: "01",
    title: "Agreement Reality Check",
    description:
      "Compare later instructions with the exact agreement evidence, then leave every finding for human review.",
    note: "Requests never become approvals automatically.",
  },
  {
    index: "02",
    title: "Decision Replay",
    description:
      "Read the chronological history of persisted agreement versions, requests, reviews, and explicit decisions.",
    note: "A record view, not an invented timeline.",
  },
] as const;

const workflow = [
  "Original agreement",
  "Later instructions",
  "Evidence-based comparison",
  "Human review",
  "Explicit authorized decision",
  "Decision Replay",
] as const;

export default function HomePage() {
  return (
    <div className="site-frame">
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="Necra home">
          Necra<span aria-hidden="true">.</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#experiences">What is planned</a>
          <a href="/sign-in">Sign in</a>
        </nav>
        <span className="foundation-status">Authentication · T003</span>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Agreement clarity, kept on the record</p>
          <h1 id="hero-title">
            Know what was agreed.
            <span>See what changed.</span>
          </h1>
          <p className="hero-copy">
            Necra is being built to help project partners review authentic evidence, make
            deliberate decisions, and preserve what happened.
          </p>
          <div className="truth-note" role="note">
            <span className="truth-marker" aria-hidden="true" />
            <p>
              Secure account sessions and project access checks are available. Agreement
              records, comparisons, reviews, and decisions are not implemented yet.
            </p>
          </div>
        </section>

        <section className="workflow" id="how-it-works" aria-labelledby="workflow-title">
          <div className="section-heading">
            <p className="eyebrow">How Necra is designed to work</p>
            <h2 id="workflow-title">Clarity before a decision</h2>
          </div>
          <ol>
            {workflow.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="experiences"
          id="experiences"
          aria-labelledby="experiences-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Signature experiences</p>
            <h2 id="experiences-title">Two views of the same truth</h2>
          </div>

          <div className="experience-list">
            {experiences.map((experience) => (
              <article className="experience" key={experience.index}>
                <span className="experience-index" aria-hidden="true">
                  {experience.index}
                </span>
                <div>
                  <div className="experience-title-row">
                    <h3>{experience.title}</h3>
                    <span className="planned-status">Planned</span>
                  </div>
                  <p>{experience.description}</p>
                  <p className="margin-note">{experience.note}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <p className="footer-text">Evidence before inference. Decisions by people.</p>
        <p className="footer-text">Authentication and authorization · T003</p>
      </footer>
    </div>
  );
}
