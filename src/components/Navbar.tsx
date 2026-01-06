import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="nav-logo">Reasonly</div>
      <div className="nav-links">
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/industries">Industries</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/security">Security</Link>
        <Link to="/pilot" className="btn-secondary">Pilot</Link>
        <a href="https://app.reasonly.ai" className="btn-primary">Sign In</a>
      </div>
    </nav>
  );
}
