import SEO from "../../components/SEO";

export default function LegalIndustry() {
  return (
    <main className="page">
      <SEO
        title="Legal & Compliance Decision Support"
        description="Reasonly helps legal and compliance teams reason through risk, uncertainty, and documentation with review-safe decision support."
        path="/industries/legal"
      />

      {/* Hero */}
      <section className="hero">
        <h1>Reasonly for Legal & Compliance</h1>
        <p>
          Decision support for environments where risk, uncertainty, and
          accountability matter more than speed or speculation.
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
          Legal and compliance teams are asked to evaluate decisions with
          incomplete information, evolving regulations, and real downstream
          consequences.
        </p>
        <p>
          Generic AI tools often overstep by offering conclusions, interpreting
          law, or producing language that creates risk rather than mitigating it.
        </p>
      </section>

      {/* Solution */}
      <section>
        <h2>How Reasonly Helps</h2>
        <ul>
          <li>
            <strong>Risk-aware reasoning</strong> that highlights uncertainty
            instead of hiding it
          </li>
          <li>
            <strong>Documentation-safe language</strong> suitable for internal
            review and escalation
          </li>
          <li>
            <strong>Clear separation of facts, assumptions, and options</strong>
          </li>
          <li>
            <strong>No legal advice</strong> or unsupported conclusions
          </li>
        </ul>
      </section>

      {/* Reasoning Tiers */}
      <section>
        <h2>Reasoning Depth That Matches the Decision</h2>
        <div className="grid">
          <div>
            <h3>Quick</h3>
            <p>
              Identify the core risk or compliance issue without over-analysis.
            </p>
          </div>
          <div>
            <h3>Balanced</h3>
            <p>
              Structured consideration of risk areas, tradeoffs, and
              documentation implications.
            </p>
          </div>
          <div>
            <h3>Deep</h3>
            <p>
              Defensible reasoning with uncertainty framing and
              <em>“If reviewed later…”</em> context.
            </p>
          </div>
        </div>
      </section>

      {/* Governance */}
      <section>
        <h2>Designed to Reduce Risk</h2>
        <p>
          Reasonly supports legal and compliance professionals by improving
          clarity and consistency — not by replacing professional judgment.
        </p>
        <ul>
          <li>Immutable audit logs</li>
          <li>Org-level documentation standards</li>
          <li>Review-ready summaries</li>
          <li>Clear disclaimers and boundaries</li>
        </ul>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Run a 60-Day Paid Pilot</h2>
        <p>
          Evaluate Reasonly with real scenarios, real teams, and real governance
          requirements — without long-term commitment.
        </p>
        <a href="/pilot" className="btn-primary">
          Request Pilot
        </a>
      </section>
    </main>
  );
}
