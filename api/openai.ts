export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { messages, model } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages must be an array" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set" });
  }

  try {
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
          messages,
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

    return res.status(200).json({
      text: data.choices[0].message.content,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
