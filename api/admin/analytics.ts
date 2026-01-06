import { getAnalytics } from "../../shared/analytics";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminKey = (process.env.ADMIN_KEY ?? "").trim();
  if (!adminKey) {
    return res.status(500).json({ error: "Missing ADMIN_KEY" });
  }

  const provided = (req?.headers?.["x-admin-key"] ?? req?.headers?.["X-Admin-Key"] ?? "").toString();
  if (provided !== adminKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(200).json(getAnalytics());
}
