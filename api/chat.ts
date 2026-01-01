import type { VercelRequest, VercelResponse } from "@vercel/node";

const SYSTEM_PROMPT = `
You are a helpful, concise assistant.
Respond clearly and professionally.
`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ].slice(-20),
      }),
    }
  );

  const reader = response.body?.getReader();
  if (!reader) {
    res.end();
    return;
  }

  const decoder = new TextDecoder();

  while (true) {
