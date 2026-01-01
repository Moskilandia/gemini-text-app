import type { VercelRequest, VercelResponse } from "vercel";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const prompt = req.body?.prompt;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini API error",
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .join("") || "Empty response";

    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || "Unexpected server error",
    });
  }
}
