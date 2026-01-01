import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setStreaming(true);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages((m) => [...m, assistantMessage]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMessage],
      }),
    });

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const token = line.replace("data: ", "");
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content:
                updated[updated.length - 1].content + token,
            };
            return updated;
          });
        }
      }
    }

    setStreaming(false);
  }

  return (
    <div style={styles.container}>
      <h1>OpenAI Chat App</h1>

      <div style={styles.chat}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              alignSelf:
                m.role === "user" ? "flex-end" : "flex-start",
              background:
                m.role === "user" ? "#4b5563" : "#374151",
            }}
          >
            {m.content}
            {streaming && i === messages.length - 1 && (
              <span className="cursor">▍</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask something…"
        rows={3}
        style={styles.input}
      />

      <button onClick={sendMessage} disabled={streaming}>
        {streaming ? "Thinking…" : "Send"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "1rem",
    color: "white",
    background: "#111827",
    minHeight: "100vh",
  },
  chat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  bubble: {
    maxWidth: "80%",
    padding: "0.75rem 1rem",
    borderRadius: "12px",
    whiteSpace: "pre-wrap" as const,
  },
  input: {
    width: "100%",
    marginBottom: "0.5rem",
    padding: "0.5rem",
    background: "#1f2933",
    color: "white",
  },
};
