import { supabase } from "../../lib/supabaseServer";
import { canAddSeat } from "../../lib/orgSeats";
import { sendInviteEmail } from "../../lib/email";
import { logAuditEvent } from "../../shared/audit";

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = await readRequestBody(req);
  const { orgId, role, userId, email } = body;
  const normalizedRole = role ?? "member";
  const inviterId = userId;
  const inviteEmail = email;

  // verify admin
  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();

  if (!member || !["owner", "admin"].includes((member as any).role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, name")
    .eq("id", orgId)
    .single();

  if (!(await canAddSeat(orgId, (org as any)?.plan))) {
    return res.status(403).json({ error: "seat_limit_reached" });
  }

  const { data: invite } = await supabase
    .from("organization_invites")
    .insert({
      org_id: orgId,
      role: normalizedRole,
      email,
      expires_at: new Date(Date.now() + 7 * 86400000), // 7 days
    })
    .select()
    .single();

  const inviteUrl = `${process.env.URL}/join/${(invite as any).token}`;

  if (email) {
    await sendInviteEmail(email, inviteUrl, (org as any).name);

    await logAuditEvent({
      orgId,
      userId: inviterId,
      actionType: "org.invite.sent",
      metadata: {
        email: inviteEmail,
        role: normalizedRole,
      },
      ip: (req as any)?.headers?.["x-forwarded-for"],
      userAgent: (req as any)?.headers?.["user-agent"],
    });
  }

  return res.json({ success: true, inviteUrl });
}
