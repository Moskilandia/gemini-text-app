import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.text,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${err.message || "Something went wrong"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.app}>
      <h1 style={styles.title}>OpenAI Chat App</h1>

      <div style={styles.chat}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              ...(msg.role === "user"
                ? styles.userBubble
                : styles.aiBubble),
            }}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.bubble, ...styles.aiBubble }}>
            Thinking<span style={styles.cursor}>▍</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          rows={2}
          placeholder="Ask something…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button style={styles.button} onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    background: "#1f1f1f",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
    maxWidth: "800px",
    margin: "0 auto",
  },
  title: {
    textAlign: "center",
    marginBottom: "1rem",
  },
  chat: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem",
    background: "#2a2a2a",
    borderRadius: "8px",
    marginBottom: "1rem",
  },
  bubble: {
    maxWidth: "85%",
    padding: "0.75rem 1rem",
    marginBottom: "0.75rem",
    borderRadius: "12px",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "#4b8cff",
    alignSelf: "flex-end",
    marginLeft: "auto",
  },
  aiBubble: {
    background: "#3a3a3a",
    alignSelf: "flex-start",
    marginRight: "auto",
  },
  inputRow: {
    display: "flex",
    gap: "0.5rem",
  },
  textarea: {
    flex: 1,
    resize: "none",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    outline: "none",
    fontSize: "1rem",
  },
  button: {
    padding: "0 1rem",
    borderRadius: "8px",
    border: "none",
    background: "#4b8cff",
    color: "#fff",
    fontSize: "1rem",
    cursor: "pointer",
  },
  cursor: {
    marginLeft: "4px",
    animation: "blink 1s infinite",
  },
};
