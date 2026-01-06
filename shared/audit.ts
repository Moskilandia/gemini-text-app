import { supabaseAdmin } from "./supabaseAdmin";

type AuditEvent = {
  orgId?: string | null;
  userId?: string | null;
  actionType: string;
  metadata?: Record<string, any>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logAuditEvent(event: AuditEvent) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      org_id: event.orgId ?? null,
      user_id: event.userId ?? null,
      action_type: event.actionType,
      action_metadata: event.metadata ?? null,
      ip_address: event.ip ?? null,
      user_agent: event.userAgent ?? null,
    });
  } catch (error) {
    // Never break primary flow
    console.error("Audit log failed:", error);
  }
}
