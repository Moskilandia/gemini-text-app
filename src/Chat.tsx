import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/clerk-react";
import "./chat.css";
import { MODELS, type ModelOption } from "./models";
import UpgradeModal from "./UpgradeModal";

const LEGACY_STORAGE_KEY = "chat-history";
const CHATS_KEY = "chats";
const MESSAGES_KEY = "messages";

type Message = {
  chatId: string;
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  userId: string | undefined;
  title: string;
  createdAt: number;
};

type Depth = "quick" | "balanced" | "deep";

export default function Chat() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const {
    isLoaded: orgsLoaded,
    createOrganization,
    setActive,
    userMemberships,
  } = useOrganizationList({ userMemberships: true });
  const canonicalUserId = user?.id;
  const userId = canonicalUserId;
  const orgId = organization?.id;
  const joinOrgId = (() => {
    try {
      const match = window.location.pathname.match(/^\/join\/([^/]+)$/);
      return match?.[1] || "";
    } catch {
      return "";
    }
  })();
  const [chats, setChats] = useState<Chat[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [model, setModel] = useState<ModelOption>(MODELS[0]);
  const depth: Depth =
    model.tier === "quick" || model.tier === "balanced" || model.tier === "deep"
      ? model.tier
      : "quick";

  const setDepth = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextDepth = e.target.value as Depth;

    if (nextDepth === "deep" && !isPremium && usage.deep >= LIMITS.deep) {
      alert("Deep analysis is limited. Upgrade for more access.");
      return;
    }

    const selected = MODELS.find((m) => m.tier === nextDepth);
    if (selected) setModel(selected);
  };
  const [isPremium, setIsPremium] = useState(
    localStorage.getItem("isPremium") === "true"
  );
  const LIMITS = isPremium
    ? { quick: 100, balanced: 50, deep: 25 }
    : { quick: 20, balanced: 10, deep: 5 };
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [email, setEmail] = useState("");
  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem("usage");
    return saved ? JSON.parse(saved) : { quick: 0, balanced: 0, deep: 0 };
  });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeMessages = activeChatId
    ? allMessages.filter((m) => m.chatId === activeChatId)
    : [];

  useEffect(() => {
    const savedChats = localStorage.getItem(CHATS_KEY);
    const savedMessages = localStorage.getItem(MESSAGES_KEY);

    // Preferred (current) format
    if (savedChats && savedMessages) {
      try {
        const parsedChats = JSON.parse(savedChats) as Chat[];
        const parsedMessages = JSON.parse(savedMessages) as Message[];
        setChats(Array.isArray(parsedChats) ? parsedChats : []);
        setAllMessages(Array.isArray(parsedMessages) ? parsedMessages : []);
        if (Array.isArray(parsedChats) && parsedChats.length > 0) {
          setActiveChatId(parsedChats[parsedChats.length - 1].id);
        }
        return;
      } catch {
        // fallthrough to migration paths
      }
    }

    // Migration: previous "threads" format { id, userId, title, messages[] }
    const legacyThreadsRaw = localStorage.getItem("threads");
    if (legacyThreadsRaw) {
      try {
        const legacyThreads = JSON.parse(legacyThreadsRaw) as any[];
        if (Array.isArray(legacyThreads) && legacyThreads.length > 0) {
          const migratedChats: Chat[] = legacyThreads
            .filter((t) => t && typeof t.id === "string")
            .map((t) => ({
              id: t.id,
              userId: typeof t.userId === "string" ? t.userId : undefined,
              title: typeof t.title === "string" ? t.title : "New chat",
              createdAt: Date.now(),
            }));

          const migratedMessages: Message[] = legacyThreads
            .flatMap((t) =>
              Array.isArray(t?.messages)
                ? t.messages
                    .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
                    .map((m: any) => ({
                      chatId: t.id,
                      role: m.role,
                      content: typeof m.content === "string" ? m.content : "",
                    }))
                : []
            );

          setChats(migratedChats);
          setAllMessages(migratedMessages);
          setActiveChatId(migratedChats[migratedChats.length - 1].id);
          return;
        }
      } catch {
        // continue
      }
    }

    // Migration: original single-chat format "chat-history" = Message[] (no chatId)
    const legacyHistoryRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyHistoryRaw) {
      try {
        const legacy = JSON.parse(legacyHistoryRaw) as any[];
        if (Array.isArray(legacy) && legacy.length > 0) {
          const id = crypto.randomUUID();
          const migratedChat: Chat = {
            id,
            userId: canonicalUserId,
            title: "New chat",
            createdAt: Date.now(),
          };
          const migratedMessages: Message[] = legacy
            .filter((m) => m && (m.role === "user" || m.role === "assistant"))
            .map((m) => ({
              chatId: id,
              role: m.role,
              content: typeof m.content === "string" ? m.content : "",
            }));

          setChats([migratedChat]);
          setAllMessages(migratedMessages);
          setActiveChatId(id);
          return;
        }
      } catch {
        // continue
      }
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("preferred-model");
    if (saved) setModel(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      localStorage.setItem("isPremium", "true");
      setIsPremium(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (model.disabled || model.tier === "premium") {
      setModel(MODELS[0]);
    }
  }, [model]);

  useEffect(() => {
    if (!joinOrgId) return;
    if (!userId) return;
    if (!orgsLoaded) return;

    (async () => {
      try {
        // Back-compat: allow /join/<orgId> for existing members
        if (joinOrgId.startsWith("org_")) {
          await setActiveOrg(joinOrgId);
        } else {
          const res = await fetch("/api/org/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: joinOrgId, userId }),
          });

          const data = await res.json();
          if (!(data as any)?.success || !(data as any)?.orgId) {
            throw new Error("invalid_invite");
          }

          await setActiveOrg((data as any).orgId);
        }
        window.history.replaceState({}, "", "/");
      } catch (err) {
        console.error("Failed to join/switch org:", err);
        alert("Unable to join that team. You may need an invitation.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinOrgId, userId, orgsLoaded]);

  useEffect(() => {
    // later: when isPremium is wired to auth/billing, we can enforce tier gating here if needed
  }, [isPremium]);

  useEffect(() => {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
  }, [allMessages]);

  useEffect(() => {
    localStorage.setItem("preferred-model", JSON.stringify(model));
  }, [model]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, loading, isTyping]);

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;

    recognition.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  function speak(text: string) {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  async function createOrg(name: string) {
    if (!orgsLoaded) {
      alert("Loading organizations...");
      return;
    }

    const org = await createOrganization({ name });
    await setActive({ organization: org.id });
  }

  async function setActiveOrg(nextOrgId: string) {
    if (!orgsLoaded) return;
    await setActive({ organization: nextOrgId || null });
  }

  const orgs = (userMemberships?.data ?? []).map((m: any) => ({
    id: m?.organization?.id,
    organizations: { name: m?.organization?.name },
  }));

  async function handleUpgrade(plan: "team" | "business") {
    if (!userId) {
      alert("Please sign in to upgrade.");
      return;
    }

    if (!orgId) {
      alert("Create or select a team first.");
      return;
    }

    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        orgId,
        plan, // used to select Stripe price
      }),
    });

    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function inviteByEmail() {
    const res = await fetch("/api/org/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        userId,
        email,
      }),
    });

    if (res.ok) {
      alert("Invite sent!");
      setEmail("");
    } else {
      const err = await res.json();
      if ((err as any).error === "seat_limit_reached") {
        setShowUpgrade(true);
      }
    }
  }

  async function upgradeToBusiness() {
    if (!userId || !orgId) return;

    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        orgId,
        plan: "business",
      }),
    });

    const data = await res.json();
    if ((data as any).url) window.location.href = (data as any).url;
  }

  async function startNewChat(firstMessage?: string) {
    const userId = canonicalUserId || "anonymous";

    const res = await fetch("/api/chat/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, firstMessage }),
    });

    const chat = await res.json();
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
  }

  async function loadChat(chatId: string) {
    const res = await fetch(`/api/chat/history?chatId=${encodeURIComponent(chatId)}`);
    const msgs = await res.json();

    setActiveChatId(chatId);
    setAllMessages((prev) => {
      const next = prev.filter((m) => m.chatId !== chatId);
      return Array.isArray(msgs) ? [...next, ...msgs] : next;
    });
  }

  function newChat() {
    void startNewChat();
  }

  function ensureActiveChat(): string {
    if (activeChatId) return activeChatId;
    const id = crypto.randomUUID();
    setChats((prev) => [
      ...prev,
      {
        id,
        userId: canonicalUserId,
        title: "New chat",
        createdAt: Date.now(),
      },
    ]);
    setActiveChatId(id);
    return id;
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const chatId = ensureActiveChat();
    const activeChatId = chatId;

    if (model.tier === "deep" && !isPremium && !canonicalUserId) {
      alert("Sign in to use Deep analysis.");
      return;
    }

    if (model.tier === "deep" && !isPremium && usage.deep >= LIMITS.deep) {
      alert("Deep analysis is limited. Upgrade to unlock more.");
      return;
    }

    const userMessage: Message = {
      chatId,
      role: "user",
      content: input,
    };

    const nextAllMessages = [...allMessages, userMessage];
    const payloadMessages = nextAllMessages
      .filter((m) => m.chatId === chatId)
      .map((m) => ({ role: m.role, content: m.content }));

    const messages = payloadMessages;

    // Add an empty assistant message that we will stream into.
    setAllMessages([...nextAllMessages, { chatId, role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setIsTyping(true);

    try {
      const token = await getToken();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          chatId: activeChatId,
          messages,
          requestedDepth: depth,
          orgId,
        }),
      });

      if (res.status === 403) {
        setShowUpgrade(true);
        return;
      }

      if (res.status === 429) {
        setShowUpgrade(true);
        return;
      }

      if (!res.ok) {
        if (res.status === 402) {
          setShowUpgrade(true);
          setAllMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i -= 1) {
              if (next[i].chatId === chatId && next[i].role === "assistant") {
                next[i] = { chatId, role: "assistant", content: "⚠️ Upgrade required" };
                break;
              }
            }
            return next;
          });
          return;
        }

        let detail = "";
        try {
          const errBody = await res.json();
          if (errBody?.code === "UPGRADE_REQUIRED") {
            setShowUpgrade(true);
          }
          detail =
            typeof errBody?.detail === "string"
              ? errBody.detail
              : typeof errBody?.error === "string"
                ? errBody.error
                : JSON.stringify(errBody);
        } catch {
          try {
            detail = await res.text();
          } catch {
            detail = "";
          }
        }
        throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
      }

      const contentType = res.headers.get("content-type") || "";

      // Streaming SSE path
      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
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

              const token = data;
              if (
                assistantText.length > 0 &&
                !assistantText.endsWith(" ") &&
                !token.startsWith(" ") &&
                !token.startsWith("\n") &&
                !/^[.,!?;:)]/.test(token)
              ) {
                assistantText += " ";
              }

              assistantText += token;
              setAllMessages((prev) => {
                const next = [...prev];
                for (let i = next.length - 1; i >= 0; i -= 1) {
                  if (next[i].chatId === chatId && next[i].role === "assistant") {
                    next[i] = { chatId, role: "assistant", content: assistantText };
                    break;
                  }
                }
                return next;
              });
            }
          }
        }

        // If we never got text, show a fallback.
        if (!assistantText.trim()) {
          setAllMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i -= 1) {
              if (next[i].chatId === chatId && next[i].role === "assistant") {
                next[i] = { chatId, role: "assistant", content: "⚠️ No response received" };
                break;
              }
            }
            return next;
          });
        } else {
          const fullText = assistantText;
          speak(fullText);
        }

        if (model.tier === "quick" || model.tier === "balanced" || model.tier === "deep") {
          setUsage((prev: any) => {
            const updated = { ...prev, [model.tier]: prev[model.tier] + 1 };
            localStorage.setItem("usage", JSON.stringify(updated));
            return updated;
          });
        }

        return;
      }

      // Non-stream fallback (JSON)
      const data = await res.json();
      setAllMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].chatId === chatId && next[i].role === "assistant") {
            next[i] = {
              chatId,
              role: "assistant",
              content:
                typeof (data as any)?.text === "string"
                  ? (data as any).text
                  : "⚠️ No response received",
            };
            break;
          }
        }
        return next;
      });

      if ((data as any).usage) {
        setUsage((prev: any) => ({
          ...prev,
          [(data as any).usage.tier]: (data as any).usage.used,
        }));
      }
    } catch (error) {
      console.error("Chat error:", error);
      const message =
        error instanceof Error ? `⚠️ ${error.message}` : "⚠️ Error contacting server";

      setAllMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (next[i].chatId === chatId && next[i].role === "assistant") {
            next[i] = { chatId, role: "assistant", content: message };
            return next;
          }
        }
        next.push({ chatId, role: "assistant", content: message });
        return next;
      });
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  }

  return (
    <div className={`chat-container depth-${model.tier}`}>
      <header className="app-header">
        <div>
          <h1 className="app-title">
            Reasonly
            {isPremium && (
              <span className="premium-badge">Premium</span>
            )}
          </h1>
          <p className="app-tagline">Think clearly. Decide confidently.</p>
        </div>

        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="auth-button">Sign in</button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton />

            <select onChange={e => setActiveOrg(e.target.value)} value={orgId ?? ""}>
              <option value="">Personal</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>
                  {o.organizations.name}
                </option>
              ))}
            </select>

            {orgId ? (
              <>
                <input
                  type="email"
                  value={email}
                  placeholder="teammate@company.com"
                  onChange={e => setEmail(e.target.value)}
                />
                <button onClick={inviteByEmail}>Send invite</button>
              </>
            ) : null}

            <button onClick={() => createOrg("My Team")}>
              Create Team
            </button>
          </SignedIn>

          <button
            className="upgrade-button"
            onClick={() => setShowUpgrade(true)}
          >
            Upgrade
          </button>
        </div>
      </header>

      <div>
        {chats.map((c) => (
          <button key={c.id} onClick={() => loadChat(c.id)}>
            {c.title}
          </button>
        ))}
      </div>

      <div className="messages">
        {activeMessages.length === 0 && (
          <div className="empty-state">
            <p className="empty-title">Welcome to Reasonly.</p>
            <p className="empty-text">
              Ask a question or describe a decision you’re working through.
            </p>

            <section className="about">
              <h2>What is Reasonly?</h2>
              <p>
                Reasonly is a practical decision assistant that helps you think clearly,
                plan effectively, and choose the right level of AI reasoning for the task
                at hand.
              </p>
              <p>
                Use Quick for everyday questions, Balanced for planning, and Deep for
                complex decisions.
              </p>
            </section>
          </div>
        )}

        {activeMessages.map((msg, index) => (
          <div key={index} className={`bubble ${msg.role}`}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}

        {isTyping && (
          <div className="bubble assistant typing">
            Assistant is typing<span className="cursor">▍</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="model-picker">
        <label className="model-label">Response depth</label>
        <p className="model-helper">
          Choose how much reasoning you want. You can switch anytime.
        </p>

        <select value={depth} onChange={setDepth}>
          <option value="quick">🟢 Quick (Free)</option>
          <option value="balanced">⚡ Balanced</option>
          <option value="deep">🧠 Deep</option>
        </select>

        <div className="model-description">{model.description}</div>
        <div className="usage-meter">
          Usage: {usage?.[depth as any] ?? 0}
        </div>
      </div>

      {showUpgrade && (
        <UpgradeModal
          onUpgrade={handleUpgrade}
          onClose={() => setShowUpgrade(false)}
        />
      )}

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
        <button onClick={newChat}>➕ New Chat</button>
        <button onClick={startListening}>🎤 Speak</button>
        <button onClick={() => setVoiceEnabled(v => !v)}>
          {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
        </button>
        <button
          onClick={() => {
            const chatId = activeChatId;
            if (!chatId) {
              setAllMessages([]);
              localStorage.removeItem(MESSAGES_KEY);
              return;
            }

            setAllMessages((prev) => prev.filter((m) => m.chatId !== chatId));
          }}
        >
          Clear Chat
        </button>
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>

      <footer className="app-footer">
        <span>Reasonly adapts its reasoning depth to your needs.</span>
      </footer>
    </div>
  );
}
