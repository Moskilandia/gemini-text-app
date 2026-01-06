export default function ReasoningDepthDiagram() {
  return (
    <svg
      width="100%"
      height="220"
      viewBox="0 0 600 220"
      role="img"
      aria-label="Reasonly reasoning depth"
    >
      {/* Quick */}
      <rect x="50" y="140" width="500" height="40" rx="6" fill="#fff" stroke="#111" />
      <text x="300" y="165" textAnchor="middle" fontSize="14">
        Quick — Fast, safe next steps
      </text>

      {/* Balanced */}
      <rect x="80" y="90" width="440" height="40" rx="6" fill="#f5f5f5" stroke="#111" />
      <text x="300" y="115" textAnchor="middle" fontSize="14">
        Balanced — Structured options & tradeoffs
      </text>

      {/* Deep */}
      <rect x="110" y="40" width="380" height="40" rx="6" fill="#eaeaea" stroke="#111" />
      <text x="300" y="65" textAnchor="middle" fontSize="14">
        Deep — Defensible analysis for review
      </text>
    </svg>
  );
}
