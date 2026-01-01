import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

 async function sendPrompt() {
  if (!prompt.trim() || loading) return;

  const updatedMessages = [
    ...messages,
    { role: "user", content: prompt },
  ];

  setMessages(updatedMessages);
  setPrompt("");
  setLoading(true);

  // Add empty assistant message for streaming
  setMessages((prev) => [
    ...prev,
    { role: "assistant", content: "" },
  ]);

  try {
    const res = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: updatedMessages,
        model,
      }),
    });

    if (!res.body) throw new Error("No stream");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let aiText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      aiText += decoder.decode(value);

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: aiText,
        };
        return copy;
      });
    }
  } catch (err: any) {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `Error: ${err.message}` },
    ]);
  } finally {
    setLoading(false);
  }
}

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>OpenAI Chat App</h1>

      {/* Model selector */}
      <div style={{ marginBottom: 12 }}>
        <label>
          Model:&nbsp;
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="gpt-3.5-turbo">
              GPT-3.5 Turbo (Free / Cheapest)
            </option>
            <option value="gpt-4o-mini">
              GPT-4o Mini (If available)
            </option>
          </select>
        </label>
      </div>

      {/* Chat window */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: 12,
          height: 400,
          overflowY: "auto",
          marginBottom: 12,
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <strong>{m.role === "user" ? "You" : "AI"}:</strong>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}

        {loading && (
          <div>
            <strong>AI:</strong> Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Prompt input */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        placeholder="Ask something…"
        style={{
          width: "100%",
          padding: 10,
          fontSize: 14,
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendPrompt();
          }
        }}
      />

      <br />
      <br />

      <button
        onClick={sendPrompt}
        disabled={loading}
        style={{
          padding: "8px 16px",
          fontSize: 14,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Thinking…" : "Send"}
      </button>
    </div>
  );
}
