import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * System prompt controls the assistant's behavior globally
 */
const SYSTEM_PROMPT = `
You are a helpful, clear, and concise AI assistant.
Respond in plain English.
Ask clarifying questions when needed.
Avoid unnecessary verbosity.
`;

/**
 * POST /api/chat
 * Body:
 * {
 *   messages: { role: "user" | "assistant"; content: string }[],
 *   model?: string
 * }
 *
 * Streams text tokens back to the client.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Method guard
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  const { messages, model } = req.body || {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages must be an array" });
  }

  // Prepare messages with system prompt + memory trimming
  const payloadMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ].slice(-20); // keep last 20 messages to control token usage

  try {
    // Initiate streaming request to OpenAI
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
          temperature: 0.7,
          messages: payloadMessages,
        }),
      }
    );

    if (!response.ok || !response.body) {
      const errText = await response.text();
      return res.status(500).json({
        error: errText || "Failed to connect to OpenAI",
      });
    }

    // Set streaming headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    // Stream tokens to client
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.replace("data: ", "");

        if (data === "[DONE]") {
          res.write("event: done\n\n");
          res.end();
          return;
        }

        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${token}\n\n`);
          }
        } catch {
          // Ignore malformed chunks safely
        }
      }
    }

    res.end();
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || "Unexpected server error",
    });
  }
}
