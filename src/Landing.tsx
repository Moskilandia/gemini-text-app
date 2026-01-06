import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";

export default function Landing() {
  return (
    <div className="landing">
      <header>
        <h1>Reasonly</h1>
        <p>Think clearly. Decide confidently.</p>
      </header>

      <section>
        <h2>Choose how much reasoning you want</h2>
        <p>
          Fast answers when you need them. Deeper thinking when it matters.
        </p>
      </section>

      <section className="tiers">
        <div>
          <h3>🟢 Quick</h3>
          <p>Fast answers for everyday questions.</p>
          <strong>Free</strong>
        </div>
        <div>
          <h3>⚡ Balanced</h3>
          <p>Structured thinking for planning.</p>
          <strong>$9 / month</strong>
        </div>
        <div>
          <h3>🧠 Deep</h3>
          <p>In-depth analysis for complex decisions.</p>
          <strong>$19 / month</strong>
        </div>
      </section>

      <footer>
        <SignedOut>
          <SignInButton>
            <button>Get Started Free</button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <a href="/app">
            <button>Go to App</button>
          </a>
        </SignedIn>
      </footer>
    </div>
  );
}
