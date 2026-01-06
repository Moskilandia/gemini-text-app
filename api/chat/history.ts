import { getMessages } from "../../shared/chatStoreDb";

export default function handler(req: any, res: any) {
  const chatId = typeof req?.query?.chatId === "string" ? req.query.chatId : undefined;
  if (!chatId) return res.status(200).json([]);

  return getMessages(chatId)
    .then((rows) =>
      res.status(200).json(
        rows.map((m) => ({
          chatId: m.chat_id,
          role: m.role,
          content: m.content,
        }))
      )
    )
    .catch((err: any) =>
      res.status(500).json({ error: "Server error", detail: err?.message || String(err) })
    );
}
