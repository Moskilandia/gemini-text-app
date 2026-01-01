import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";

const SYSTEM_PROMPT = `
You are a helpful, concise AI assistant.
`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await verifyToken(authHeader.replace("Bearer ", ""), {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  const { messages, model } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  const payloadMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ].slice(-20);

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-3.5-turbo",
        stream: true,
        messages: payloadMessages,
      }),
    }
  );

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const reader = response.body?.getReader();
  if (!reader) return res.end();

  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(Boolean);

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.replace("data: ", "");
        if (data === "[DONE]") return res.end();

        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content;
          if (token) res.write(`data: ${token}\n\n`);
        } catch {}
      }
    }
  }

  res.end();
}
