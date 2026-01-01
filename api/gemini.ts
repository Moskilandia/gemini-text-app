export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400 }
    );
  }

  const prompt = body?.prompt;
  if (!prompt || typeof prompt !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing or invalid prompt" }),
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not set" }),
      { status: 500 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data?.error?.message || "Gemini API error",
        }),
        { status: response.status }
      );
    }

    if (!data?.candidates?.length) {
      return new Response(
        JSON.stringify({ error: "Gemini returned no candidates" }),
        { status: 502 }
      );
    }

    const text =
      data.candidates[0].content?.parts
        ?.map((p: any) => p.text)
        .join("") || "Empty response";

    return new Response(JSON.stringify({ text }), { status: 200 });

  } catch (err: any) {
    if (err?.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "Gemini request timed out" }),
        { status: 504 }
      );
    }

    return new Response(
      JSON.stringify({ error: err?.message || "Server error" }),
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
