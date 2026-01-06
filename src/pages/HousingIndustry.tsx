import SEO from "../components/SEO";

export default function HousingIndustry() {
  return (
    <>
      <SEO
        title="Housing & Social Services Decision Support"
        description="Reasonly helps housing and social service teams make clear, defensible decisions with documentation-safe reasoning and audit-ready outputs."
        path="/industries/housing"
      />
      <main className="page">
        {/* Hero */}
        <section className="hero">
          <h1>Reasonly for Housing & Social Services</h1>
          <p>
            Decision support designed for high-stakes environments where
            compliance, documentation, and human impact all matter.
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
            Housing and social service teams make complex decisions every day —
            often with incomplete information, limited time, and real consequences
            for clients and programs.
          </p>
          <p>
            Generic AI tools are not built for this environment. They overstep,
            speculate, or produce language that does not hold up in supervision,
            audits, or case review.
          </p>
        </section>
        {/* Solution */}
        <section>
          <h2>How Reasonly Helps</h2>
          <ul>
            <li>
              <strong>Decision-focused reasoning</strong> — not generic chat or
              content generation
            </li>
            <li>
              <strong>Documentation-safe language</strong> designed to reduce risk
              during audits or reviews
            </li>
            <li>
              <strong>Supervisor-ready summaries</strong> for quick escalation or
              consultation
            </li>
            <li>
              <strong>Audit logs and governance</strong> built in for teams
            </li>
          </ul>
        </section>
        {/* Reasoning Tiers */}
        <section>
          <h2>Reasoning That Adapts to the Situation</h2>
          <div className="grid">
            <div>
              <h3>Quick</h3>
              <p>
                Fast, safe next steps for outreach, engagement, or immediate
                concerns.
              </p>
            </div>
            <div>
              <h3>Balanced</h3>
              <p>
                Structured options with compliance considerations and
                documentation implications.
              </p>
            </div>
            <div>
              <h3>Deep</h3>
              <p>
                Defensible analysis with risk framing and
                <em>“If reviewed later…”</em> context.
              </p>
            </div>
          </div>
        </section>
        {/* Governance */}
        <section>
          <h2>Built for Accountability</h2>
          <p>
            Reasonly is designed to support professional judgment — not replace it.
            Outputs are structured to survive supervisor review, funder questions,
            and internal audits.
          </p>
          <ul>
            <li>Immutable audit logs</li>
            <li>Org-level documentation standards</li>
            <li>Secure exports for case notes and reviews</li>
            <li>No legal or medical advice</li>
          </ul>
        </section>
        {/* CTA */}
        <section className="cta">
          <h2>Run a 60-Day Paid Pilot</h2>
          <p>
            Evaluate Reasonly with real cases, real staff, and real documentation
            needs — without a long-term commitment.
          </p>
          <a href="/pilot" className="btn-primary">
            Request Pilot
          </a>
        </section>
      </main>
    </>
  );
}
