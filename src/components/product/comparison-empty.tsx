import { StatusLozenge } from "@/components/ui/primitives";

export function ComparisonEmpty() {
  return (
    <section
      className="comparison-empty"
      aria-label="Agreement comparison is not available yet"
    >
      <section className="source-placeholder" aria-labelledby="agreement-source-title">
        <div className="source-placeholder-heading">
          <span className="source-number" aria-hidden="true">
            A
          </span>
          <div>
            <p className="source-kicker">Baseline source</p>
            <h3 id="agreement-source-title">Original agreement</h3>
          </div>
        </div>
        <StatusLozenge tone="planned">Not added</StatusLozenge>
        <p>No agreement source is available in the product yet.</p>
      </section>

      <section className="source-placeholder" aria-labelledby="instruction-source-title">
        <div className="source-placeholder-heading">
          <span className="source-number" aria-hidden="true">
            B
          </span>
          <div>
            <p className="source-kicker">Later evidence</p>
            <h3 id="instruction-source-title">New instructions</h3>
          </div>
        </div>
        <StatusLozenge tone="planned">Not added</StatusLozenge>
        <p>No change request source is available in the product yet.</p>
      </section>

      <aside className="findings-margin" aria-labelledby="findings-margin-title">
        <p className="margin-kicker">Findings margin</p>
        <h3 id="findings-margin-title">Nothing to compare</h3>
        <p>
          Findings will appear only after exact source versions exist and a comparison has
          completed. They will not be treated as decisions.
        </p>
      </aside>
    </section>
  );
}
