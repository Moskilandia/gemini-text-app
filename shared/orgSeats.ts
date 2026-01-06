import { supabase } from "./supabaseServer";
import { ORG_SEAT_LIMITS } from "./orgSeatLimits";

export async function getSeatCount(orgId: string) {
  const { count } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  return count ?? 0;
}

export async function canAddSeat(orgId: string, plan: keyof typeof ORG_SEAT_LIMITS) {
  const used = await getSeatCount(orgId);
  return used < ORG_SEAT_LIMITS[plan];
}
