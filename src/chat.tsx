import { useEffect, useRef, useState } from "react";
import "./chat.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errBody = await response.json();
          detail =
            typeof errBody?.detail === "string"
              ? errBody.detail
              : typeof errBody?.error === "string"
                ? errBody.error
                : JSON.stringify(errBody);
        } catch {
          try {
            detail = await response.text();
          } catch {
            detail = "";
          }
        }
        throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
      }

      const data: { text?: string } = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.text || "⚠️ No response received",
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `⚠️ ${error.message}`
              : "⚠️ Error contacting server",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="bubble assistant typing">
            Typing…
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-row">
        <input
          type="text"
          value={input}
          placeholder="Type your message..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
