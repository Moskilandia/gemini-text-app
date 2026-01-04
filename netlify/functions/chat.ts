import type { Handler } from "@netlify/functions";
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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const apiKeyRaw = process.env.OPENAI_API_KEY;
    const apiKey = (apiKeyRaw ?? "")
      .trim()
      .replace(/^['\"]+/, "")
      .replace(/['\"]+$/, "");

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    let parsed: any = {};
    try {
      parsed = event.body ? JSON.parse(event.body) : {};
    } catch {
      parsed = {};
    }

    const messages = parseMessages(parsed?.messages);
    if (messages.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing messages" }),
      };
    }

    const userText = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await client.responses.create({
      model,
      instructions: SYSTEM_PROMPT,
      input: userText,
    });

    const text = response.output_text || "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch (err: any) {
    console.error("API ERROR:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server error",
        detail: err?.message || String(err),
      }),
    };
  }
};
