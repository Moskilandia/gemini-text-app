import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

export default function JoinOrg() {
  const { token } = useParams();
  const { user } = useUser();
  const navigate = useNavigate();

  async function join() {
    await fetch("/api/org/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId: user.id }),
    });

    navigate("/app");
  }

  return (
    <div>
      <h1>Join team</h1>
      <button onClick={join}>Accept invite</button>
    </div>
  );
}
