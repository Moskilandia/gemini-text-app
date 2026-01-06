import { ensureUser } from "../../shared/db";
import { createChat } from "../../shared/chatStoreDb";

async function readRequestBody(req: any): Promise<any> {
  if (req?.body != null) {
    if (typeof req.body === "string") {
      return req.body ? JSON.parse(req.body) : {};
    }
    return req.body;
  }

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve());
    req.on("error", reject);
  });

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function parseString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = await readRequestBody(req);

  const userId = parseString(body?.userId) ?? "anonymous";
  const firstMessage = parseString(body?.firstMessage);

  await ensureUser(userId);
  const chat = await createChat(userId, firstMessage?.slice(0, 40) || "New chat");

  return res.status(200).json({
    id: chat.id,
    userId: chat.user_id,
    title: chat.title ?? "New chat",
    createdAt: new Date(chat.created_at).getTime(),
  });
}
