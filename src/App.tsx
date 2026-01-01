import { useState } from "react";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendPrompt() {
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResponse(data.text);
    } catch (err: any) {
      setResponse(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>OpenAI Text App</h1>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={6}
        style={{ width: "100%" }}
        placeholder="Ask something..."
      />

      <br /><br />

      <button onClick={sendPrompt} disabled={loading}>
        {loading ? "Thinking..." : "Send to OpenAI"}
      </button>

      <h3>Response:</h3>
      <pre>{response}</pre>
    </div>
  );
}
