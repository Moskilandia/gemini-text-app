import SEO from "../components/SEO";

export default function Home() {
  return (
    <main className="page">
      <SEO
        title="Decision Intelligence Platform"
        description="Reasonly is a decision intelligence platform that adapts its reasoning to your industry, your team, and the level of depth you need."
        path="/"
      />

      <section className="hero">
        <h1>Think clearly. Decide confidently.</h1>
        <p>
          Reasonly is a decision intelligence platform that adapts its reasoning
          to your industry, your team, and the level of depth you need.
        </p>
      </section>
    </main>
  );
}
