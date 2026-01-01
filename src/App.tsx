import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "openai-chat-history";
const MODEL_KEY = "openai-chat-model";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  /* =====================
     Load persisted state
  ===================== */
  useEffect(() => {
    const savedChat = localStorage.getItem(STORAGE_KEY);
    const savedModel = localStorage.getItem(MODEL_KEY);

    if (savedChat) setMessages(JSON.parse(savedChat));
    if (savedModel) setModel(savedModel);
  }, []);

  /* =====================
     Persist state
  ===================== */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    localStorage.setItem(MODEL_KEY, model);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, model]);

  /* =====================
     Speech Recognition
  ===================== */
  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  /* =====================
     Text-to-Speech
  ===================== */
  function speak(text: string) {
    if (!voiceEnabled) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = "en-US";

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  /* =====================
     Send Message (Streaming)
  ===================== */
  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input };
    const assistantMessage: Message = { role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setStreaming(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMessage],
        model,
      }),
    });

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const token = line.replace("data: ", "");
          fullResponse += token;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: fullResponse,
            };
            return updated;
          });
        }
      }
    }

    setStreaming(false);
    speak(fullResponse);
  }

  function clearChat() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }

  /* =====================
     UI
  ===================== */
  return (
    <div style={styles.container}>
      <h1>AI Voice Chat</h1>

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
              alignSelf:
                m.role === "user" ? "flex-end" : "flex-start",
              background:
                m.role === "user" ? "#4b5563" : "#374151",
            }}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Speak or type…"
          rows={2}
          style={styles.input}
        />

        <button onClick={startListening}>
          {listening ? "🎙️ Listening…" : "🎤 Speak"}
        </button>

        <button onClick={sendMessage} disabled={streaming}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "1rem",
    color: "white",
    background: "#111827",
    minHeight: "100vh",
  },
  controls: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.75rem",
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
  inputRow: {
    display: "flex",
    gap: "0.5rem",
  },
  input: {
    flex: 1,
    padding: "0.5rem",
    background: "#1f2933",
    color: "white",
  },
};
