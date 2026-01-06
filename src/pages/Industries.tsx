import SEO from "../components/SEO";

export default function Industries() {
  return (
    <>
      <SEO
        title="Industries"
        description="Reasonly supports decision-making across Housing, Legal, Operations, and other professional domains."
        path="/industries"
      />
      <main className="page">
      <h1>Industries</h1>

      <section className="grid">
        <a href="/industries/housing">
          <h3>Housing & Social Services</h3>
          <p>Decision support for high-stakes, compliance-heavy work.</p>
        </a>

        <a href="/industries/legal">
          <h3>Legal & Compliance</h3>
          <p>Risk-aware reasoning without legal advice.</p>
        </a>

        <a href="/industries/operations">
          <h3>Operations & Management</h3>
          <p>Clear thinking for prioritization, constraints, and tradeoffs.</p>
        </a>

        <div>
          <h3>More Coming</h3>
          <p>Reasonly scales to additional professional domains.</p>
        </div>
      </section>
    </main>
      </main>
    </>
  );
}
