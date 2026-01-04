import OpenAI from "openai";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    return;
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});

    const messages = parseMessages((body as any).messages);
    if (messages.length === 0) {
      res.status(400).json({ error: "Missing messages" });
      return;
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "";

    res.status(200).json({ text });
  } catch (error) {
    console.error("/api/chat error:", error);
    res.status(500).json({ error: "Server error" });
  }
}
