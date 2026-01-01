export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const prompt = body?.prompt;

  if (!prompt || typeof prompt !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing or invalid prompt" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

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
    return new Response(
      JSON.stringify({ error: data?.error?.message || "Gemini API error" }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text)
      .join("") || "Empty response from Gemini";

  return new Response(
    JSON.stringify({ text }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
