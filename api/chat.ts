import type { VercelRequest, VercelResponse } from "@vercel/node";

const SYSTEM_PROMPT = `
You are a helpful, clear, and concise AI assistant.
Respond in plain English.
If a question is unclear, ask for clarification.
Avoid unnecessary verbosity.
`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  const { messages } = req.body || {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages must be an array" });
  }

  try {
    // Inject system message at the top
    const payloadMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ].slice(-20); // keep last 20 messages to control token usage

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
          messages: payloadMessages,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || "OpenAI API error",
      });
    }

    const text =
      data.choices?.[0]?.message?.content || "No response";

    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}
