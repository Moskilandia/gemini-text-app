type Props = {
  onUpgrade: (plan: "team" | "business") => void;
  onClose: () => void;
};

export default function UpgradeModal({ onUpgrade, onClose }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Upgrade Reasonly</h2>
        <p>
          Choose how much reasoning power you want. Switch plans anytime.
        </p>

        <div className="plans">
          <div className="plan">
            <h3>Team</h3>
            <p>Great for small teams.</p>
            <strong>$9 / month</strong>
            <button onClick={() => onUpgrade("team")}>
              Upgrade to Team
            </button>
          </div>

          <div className="plan highlight">
            <h3>Business</h3>
            <p>More seats and higher limits.</p>
            <strong>$19 / month</strong>
            <button onClick={() => onUpgrade("business")}>
              Upgrade to Business
            </button>
          </div>
        </div>

        <button className="close" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
