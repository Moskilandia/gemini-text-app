import { supabase } from "../../lib/supabaseServer";
import { clerkClient } from "@clerk/backend";

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
  const { token, userId } = body;

  const { data: invite } = await supabase
    .from("organization_invites")
    .select("*")
    .eq("token", token)
    .single();

    // Audit log: SSO login success
    try {
      const domain = primaryEmailAddress?.emailAddress?.split("@")[1];
      const { logAuditEvent } = await import("../../shared/audit.ts");
      await logAuditEvent({
        orgId: invite.org_id,
        userId,
        actionType: "sso.login.success",
        metadata: { domain },
      });
    } catch (e) {
      console.error("Audit log failed", e);
    }
  if (!invite || !invite.expires_at || new Date(invite.expires_at) < new Date()) {
    // Audit log: SSO login denied
    try {
      // Attempt to extract domain from user if possible
      let domain = undefined;
      if (userId) {
        const user = await clerkClient.users.getUser(userId);
        const primaryEmailAddress = (user as any)?.emailAddresses?.find(
          (e: any) => e?.id === (user as any)?.primaryEmailAddressId
        );
        domain = primaryEmailAddress?.emailAddress?.split("@")[1];
      }
      const { logAuditEvent } = await import("../../shared/audit.ts");
      await logAuditEvent({
        userId,
        actionType: "sso.login.denied",
        metadata: { domain },
      });
    } catch (e) {
      console.error("Audit log failed", e);
    }
    return res.status(400).json({ error: "invalid_invite" });
  }

  const user = await clerkClient.users.getUser(userId);
  const primaryEmailAddress = (user as any)?.emailAddresses?.find(
    (e: any) => e?.id === (user as any)?.primaryEmailAddressId
  );

  if (invite.email && invite.email !== primaryEmailAddress?.emailAddress) {
    return res.status(403).json({ error: "email_mismatch" });
  }

  await supabase.from("organization_members").insert({
    org_id: invite.org_id,
    user_id: userId,
    role: invite.role,
  });

  await supabase
    .from("organization_invites")
    .delete()
    .eq("token", token);

  return res.json({ success: true, orgId: invite.org_id });
}
