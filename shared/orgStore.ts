import { supabase } from "./supabaseServer";

export type Organization = {
  id: string;
  plan: string | null;
  stripe_customer_id: string | null;
};

export async function getOrg(orgId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,plan,stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (error) {
    // If the org doesn't exist, treat as missing.
    if ((error as any).code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return (data ?? null) as Organization | null;
}
