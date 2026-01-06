import { listChats } from "../shared/chatStoreDb";

export default function handler(req: any, res: any) {
  const { userId } = req.query;
  if (typeof userId !== "string" || !userId.trim()) return res.json([]);

  return listChats(userId)
    .then((rows) =>
      res.json(
        rows.map((c) => ({
          id: c.id,
          userId: c.user_id,
          title: c.title ?? "New chat",
          createdAt: new Date(c.created_at).getTime(),
        }))
      )
    )
    .catch((err: any) => res.status(500).json({ error: "Server error", detail: err?.message || String(err) }));
}
