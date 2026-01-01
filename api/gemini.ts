export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid prompt" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({
        error: data?.error?.message || "OpenAI API error",
      });
    }

    const text =
      data?.choices?.[0]?.message?.content || "No response from OpenAI";

    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}
