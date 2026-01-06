type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : undefined;
  return ip || req.headers.get("x-nf-client-connection-ip") || "anonymous";
}

function isRateLimited(key: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now >= current.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { limited: false, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

type AllowedModel = "gpt-4o-mini" | "gpt-4o";

function parseModel(value: unknown): AllowedModel | undefined {
  if (value === "gpt-4o-mini" || value === "gpt-4o") return value;
  return undefined;
}

const SYSTEM_PROMPT = `
You are a practical decision assistant.

Your role is to help users think clearly, plan effectively, and make informed decisions.
You prioritize clarity, structure, and usefulness over verbosity.

Guidelines:
- Ask clarifying questions when the request is ambiguous.
- Break complex problems into steps or options.
- Offer concise answers by default, with the option to go deeper if needed.
- Clearly state assumptions and uncertainties.
- Avoid unnecessary speculation or overconfidence.
- Be neutral, respectful, and supportive.

When appropriate:
- Suggest next steps.
- Provide examples.
- Summarize key points.

Your goal is to help the user move forward with confidence.
`;

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function parseMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ChatMessage =>
        typeof item === "object" &&
        item !== null &&
        "role" in item &&
        "content" in item &&
        typeof (item as any).role === "string" &&
        typeof (item as any).content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

function normalizeKey(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^['\"]+/, "")
    .replace(/['\"]+$/, "");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const rl = isRateLimited(getClientKey(req));
  if (rl.limited) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Retry-After": String(rl.retryAfterSeconds),
      },
    });
  }

  const apiKey = normalizeKey((globalThis as any).Deno?.env?.get?.("OPENAI_API_KEY"));
  if (!apiKey) {
    return json(500, { error: "Missing OPENAI_API_KEY" });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const messages = parseMessages(body?.messages);
  if (messages.length === 0) {
    return json(400, { error: "Missing messages" });
  }

  const tier = body?.tier;

  const provider = body?.provider ?? "openai";
  if (provider !== "openai") {
    return json(400, {
      error: "Unsupported provider",
      detail: "Only provider 'openai' is supported by this endpoint.",
    });
  }

  const conversation = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
  const input = conversation.map(m => `${m.role}: ${m.content}`).join("\n");

  const requestedModel = parseModel(body?.model);
  const model =
    (requestedModel ??
      (normalizeKey((globalThis as any).Deno?.env?.get?.("OPENAI_MODEL")) || "gpt-4o-mini")) as AllowedModel;

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return json(upstream.status || 500, {
      error: "Upstream error",
      detail: detail || upstream.statusText,
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    const reader = upstream.body!.getReader();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // OpenAI streams as SSE: lines separated by \n, events separated by blank line.
        // Each event contains one or more lines like: "data: {json}".
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
            if (!data || data === "[DONE]") continue;

            let parsed: any;
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }

            if (parsed?.type === "response.output_text.delta" && typeof parsed.delta === "string") {
              await writer.write(encoder.encode(`data: ${parsed.delta}\n\n`));
            }

            if (parsed?.type === "response.completed") {
              await writer.write(encoder.encode("data: [DONE]\n\n"));
            }
          }
        }
      }
    } catch {
      try {
        await writer.write(encoder.encode("data: [ERROR]\n\n"));
      } catch {
        // ignore
      }
    } finally {
      try {
        await writer.close();
      } catch {
        // ignore
      }
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
