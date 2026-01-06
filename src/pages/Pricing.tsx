import SEO from "../components/SEO";

export default function Pricing() {
  return (
    <>
      <SEO
        title="Pricing"
        description="Simple pricing for individuals and teams. Choose Quick, Balanced, or Deep reasoning."
        path="/pricing"
      />
    <main className="page">
      <h1>Pricing</h1>

      <section className="pricing">
        <div>
          <h3>Free</h3>
          <p>Quick reasoning</p>
          <strong>$0</strong>
        </div>

        <div>
          <h3>Balanced</h3>
          <p>Structured reasoning</p>
          <strong>$9 / mo</strong>
        </div>

        <div>
          <h3>Deep</h3>
          <p>Defensible analysis</p>
          <strong>$19 / mo</strong>
        </div>

        <div>
          <h3>Business</h3>
          <p>Teams + governance</p>
          <strong>$149 / mo</strong>
        </div>
      </section>
    </main>
    </>
  );
}
