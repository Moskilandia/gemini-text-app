import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function streamAssistant(messagesToSend: Message[]) {
    setStreaming(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messagesToSend }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    let assistantText = "";

    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.startsWith("data:"));

      for (const line of lines) {
        const data = line.replace("data: ", "");
        if (data === "[DONE]") {
          setStreaming(false);
          return;
        }

        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content;

          if (token) {
            assistantText += token;
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = {
                role: "assistant",
                content: assistantText,
              };
              return copy;
            });
          }
        } catch {}
      }
    }

    setStreaming(false);
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const updated: Message[] = [
      ...messages,
      { role: "user", content: input },
      { role: "assistant", content: "" },
    ];

    setMessages(updated);
    setInput("");

    await streamAssistant(updated.slice(0, -1));
  }

  async function regenerate() {
    if (streaming) return;

    // Remove last assistant message only
    const trimmed = messages.filter(
      (m, i) =>
        !(i === messages.length - 1 && m.role === "assistant")
    );

    const withPlaceholder: Message[] = [
      ...trimmed,
      { role: "assistant", content: "" },
    ];

    setMessages(withPlaceholder);

    await streamAssistant(trimmed);
  }

  return (
    <div className="chat-container">
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
            {streaming && i === messages.length - 1 && (
              <span className="cursor">▍</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <textarea
        placeholder="Ask something…"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        }}
      />

      <div className="actions">
        <button onClick={sendMessage} disabled={streaming}>
          Send
        </button>

        {messages.length >= 2 &&
          messages[messages.length - 1].role === "assistant" && (
            <button onClick={regenerate} disabled={streaming}>
              🔄 Regenerate
            </button>
          )}
      </div>
    </div>
  );
}
