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
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isTyping]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    const updatedMessages = [...messages, userMessage];

    // Add an empty assistant message that we will stream into.
    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setIsTyping(true);

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

      const contentType = response.headers.get("content-type") || "";

      // Streaming SSE path
      if (contentType.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Missing response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const lines = rawEvent
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice("data:".length).trim();
              if (!data) continue;

              if (data === "[DONE]") {
                // Stream complete
                continue;
              }

              if (data === "[ERROR]") {
                throw new Error("Streaming error");
              }

              assistantText += data;
              setMessages((prev) => {
                const next = [...prev];
                const lastIndex = next.length - 1;
                if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
                  next[lastIndex] = { role: "assistant", content: assistantText };
                }
                return next;
              });
            }
          }
        }

        // If we never got text, show a fallback.
        if (!assistantText.trim()) {
          setMessages((prev) => {
            const next = [...prev];
            const lastIndex = next.length - 1;
            if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
              next[lastIndex] = { role: "assistant", content: "⚠️ No response received" };
            }
            return next;
          });
        }

        return;
      }

      // Non-stream fallback (JSON)
      const data: { text?: string } = await response.json();
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          next[lastIndex] = {
            role: "assistant",
            content: data.text || "⚠️ No response received",
          };
        }
        return next;
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        const message =
          error instanceof Error
            ? `⚠️ ${error.message}`
            : "⚠️ Error contacting server";

        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          next[lastIndex] = { role: "assistant", content: message };
        } else {
          next.push({ role: "assistant", content: message });
        }

        return next;
      });
    } finally {
      setLoading(false);
      setIsTyping(false);
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

        {isTyping && (
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
