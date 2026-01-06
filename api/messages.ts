import { getMessages } from "../shared/chatStoreDb";

export default function handler(req: any, res: any) {
  const { chatId } = req.query;
  if (typeof chatId !== "string" || !chatId.trim()) return res.json([]);

  return getMessages(chatId)
    .then((rows) =>
      res.json(
        rows.map((m) => ({
          chatId: m.chat_id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        }))
      )
    )
    .catch((err: any) => res.status(500).json({ error: "Server error", detail: err?.message || String(err) }));
}
