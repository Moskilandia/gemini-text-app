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
          stream: true,
        }),
      }
    );

    if (!response.ok || !response.body) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    // STREAM SETUP
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        if (line.includes("[DONE]")) return res.end();

        try {
          const json = JSON.parse(line.replace("data:", ""));
          const token = json.choices?.[0]?.delta?.content;
          if (token) res.write(token);
        } catch {
          // ignore malformed chunks
        }
      }
    }

    res.end();
  } catch (err: any) {
    res.status(500).end(err.message);
  }
}
