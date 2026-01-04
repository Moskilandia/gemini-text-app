import OpenAI from "openai";

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

async function readRequestBody(req: any): Promise<any> {
  if (req?.body != null) {
    if (typeof req.body === "string") {
      return req.body ? JSON.parse(req.body) : {};
    }
    return req.body;
  }

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve());
    req.on("error", reject);
  });

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
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

export default async function handler(
  req: any,
  res: any
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKeyRaw = process.env.OPENAI_API_KEY;
    const apiKey = (apiKeyRaw ?? "")
      .trim()
      .replace(/^['\"]+/, "")
      .replace(/['\"]+$/, "");

    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const body = await readRequestBody(req);
    const messages = parseMessages((body as any)?.messages);
    if (messages.length === 0) {
      return res.status(400).json({ error: "Missing messages" });
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("API ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      detail: err?.message || String(err),
    });
  }
}
