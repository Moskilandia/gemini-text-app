type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const SYSTEM_PROMPT = `
You are a helpful project assistant.
You help users plan, organize, and execute projects.
You ask clarifying questions, suggest next steps,
and keep answers clear and actionable.
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

  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const model =
    normalizeKey((globalThis as any).Deno?.env?.get?.("OPENAI_MODEL")) || "gpt-4o-mini";

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: SYSTEM_PROMPT,
      input: userText,
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
