import { supabase } from "./supabaseServer";

export async function getUserPlan(userId: string) {
  const { data } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  return data?.plan ?? "free";
}

export async function setUserPlan(userId: string, plan: string) {
  await supabase.from("users").upsert({
    id: userId,
    plan,
  });
}
