import { useEffect, useRef, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignIn,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "chat-history";
const MODEL_KEY = "chat-model";

export default function App() {
  const { getToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Load persisted chat + model
  useEffect(() => {
    const savedChat = localStorage.getItem(STORAGE_KEY);
    const savedModel = localStorage.getItem(MODEL_KEY);
    if (savedChat) setMessages(JSON.parse(savedChat));
    if (savedModel) setModel(savedModel);
  }, []);

  // Persist + autoscroll
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    localStorage.setItem(MODEL_KEY, model);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, model]);

  function speak(text: string) {
    if (!voiceEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input };
    const assistantMessage: Message = { role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setStreaming(true);

    const token = await getToken();

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [...messages, userMessage],
        model,
      }),
    });

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const token = line.replace("data: ", "");
          fullText += token;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: fullText,
            };
            return updated;
          });
        }
      }
    }

    speak(fullText);
    setStreaming(false);
  }

  function clearChat() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }

  return (
    <div style={styles.container}>
      <SignedOut>
        <SignIn />
      </SignedOut>

      <SignedIn>
        <header style={styles.header}>
          <h1>AI Voice Chat</h1>
          <UserButton />
        </header>

        <div style={styles.controls}>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
          </select>

          <button onClick={() => setVoiceEnabled(!voiceEnabled)}>
            {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
          </button>

          <button onClick={clearChat}>Clear</button>
        </div>

        <div style={styles.chat}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                ...styles.bubble,
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background:
                  m.role === "user" ? "#4b5563" : "#374151",
              }}
            >
              {m.content}
              {streaming && i === messages.length - 1 && " ▍"}
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />

        <button onClick={sendMessage} disabled={streaming}>
          {streaming ? "Thinking…" : "Send"}
        </button>
      </SignedIn>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#111827",
    color: "white",
    padding: "1rem",
    maxWidth: 900,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controls: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.5rem",
  },
  chat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
    marginBottom: "0.75rem",
  },
  bubble: {
    maxWidth: "80%",
    padding: "0.75rem 1rem",
    borderRadius: "12px",
    whiteSpace: "pre-wrap" as const,
  },
  input: {
    width: "100%",
    padding: "0.5rem",
    background: "#1f2933",
    color: "white",
    marginBottom: "0.5rem",
  },
};
