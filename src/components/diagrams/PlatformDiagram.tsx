export default function PlatformDiagram() {
  return (
    <svg
      width="100%"
      height="260"
      viewBox="0 0 800 260"
      role="img"
      aria-label="Reasonly platform overview"
    >
      {/* Platform */}
      <rect x="150" y="20" width="500" height="120" rx="8" fill="#f5f5f5" stroke="#111" />
      <text x="400" y="50" textAnchor="middle" fontSize="18" fontWeight="600">
        Reasonly Platform
      </text>
      <text x="400" y="80" textAnchor="middle" fontSize="14">
        Server-enforced reasoning · Audit logs · Governance
      </text>

      {/* Domain Boxes */}
      <rect x="180" y="170" width="140" height="60" rx="6" fill="#fff" stroke="#111" />
      <rect x="330" y="170" width="140" height="60" rx="6" fill="#fff" stroke="#111" />
      <rect x="480" y="170" width="140" height="60" rx="6" fill="#fff" stroke="#111" />

      <text x="250" y="205" textAnchor="middle" fontSize="14">Housing</text>
      <text x="400" y="205" textAnchor="middle" fontSize="14">Legal</text>
      <text x="550" y="205" textAnchor="middle" fontSize="14">Operations</text>

      {/* Lines */}
      <line x1="250" y1="140" x2="250" y2="170" stroke="#111" />
      <line x1="400" y1="140" x2="400" y2="170" stroke="#111" />
      <line x1="550" y1="140" x2="550" y2="170" stroke="#111" />
    </svg>
  );
}
