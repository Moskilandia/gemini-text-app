import SEO from "../../components/SEO";

export default function OperationsIndustry() {
  return (
    <main className="page">
      <SEO
        title="Operations & Management Decision Support"
        description="Reasonly helps operations and management teams reason through priorities, constraints, and tradeoffs with clear, review-safe decision support."
        path="/industries/operations"
      />

      {/* Hero */}
      <section className="hero">
        <h1>Reasonly for Operations & Management</h1>
        <p>
          Decision support for leaders balancing priorities, resources, and
          real-world constraints — without turning decisions into tasks.
        </p>
        <div className="cta-row">
          <a href="/pilot" className="btn-primary">
            Request a Team Pilot
          </a>
        </div>
      </section>

      {/* Problem */}
      <section>
        <h2>The Challenge</h2>
        <p>
          Operations and management teams constantly make decisions under
          pressure: limited capacity, competing initiatives, and unclear
          tradeoffs.
        </p>
        <p>
          Generic AI tools often over-analyze, jump to conclusions, or drift into
          task management — none of which help leaders make clearer decisions.
        </p>
      </section>

      {/* Solution */}
      <section>
        <h2>How Reasonly Helps</h2>
        <ul>
          <li>
            <strong>Clear decision framing</strong> that separates goals,
            constraints, and options
          </li>
          <li>
            <strong>Tradeoff-aware reasoning</strong> instead of one-size-fits-all
            recommendations
          </li>
          <li>
            <strong>Review-safe language</strong> suitable for leadership and
            cross-team discussions
          </li>
          <li>
            <strong>No task or project management</strong> — Reasonly supports
            thinking, not execution
          </li>
        </ul>
      </section>

      {/* Reasoning Tiers */}
      <section>
        <h2>Reasoning That Matches the Decision</h2>
        <div className="grid">
          <div>
            <h3>Quick</h3>
            <p>
              Clarify the core decision and immediate consideration without
              overthinking.
            </p>
          </div>
          <div>
            <h3>Balanced</h3>
            <p>
              Structured options with tradeoffs, resource considerations, and
              timing impacts.
            </p>
          </div>
          <div>
            <h3>Deep</h3>
            <p>
              In-depth analysis of constraints, dependencies, and second-order
              effects with
              <em>“If reviewed later…”</em> framing.
            </p>
          </div>
        </div>
      </section>

      {/* Governance */}
      <section>
        <h2>Built for Leadership Review</h2>
        <p>
          Reasonly helps leaders explain decisions clearly — not just make them.
          Outputs are structured to support alignment, transparency, and
          accountability.
        </p>
        <ul>
          <li>Immutable audit logs</li>
          <li>Org-level documentation standards</li>
          <li>Supervisor- and executive-ready summaries</li>
          <li>Secure exports for planning and review</li>
        </ul>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Run a 60-Day Paid Pilot</h2>
        <p>
          Evaluate Reasonly with real operational decisions, real leadership
          teams, and real constraints — without long-term commitment.
        </p>
        <a href="/pilot" className="btn-primary">
          Request Pilot
        </a>
      </section>
    </main>
  );
}
