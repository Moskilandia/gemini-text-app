import { supabase } from "./supabaseServer";

export async function incrementUsage(userId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("usage_daily")
    .select("message_count")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (!data) {
    await supabase.from("usage_daily").insert({
      user_id: userId,
      date: today,
      message_count: 1,
    });
    return 1;
  }

  const next = data.message_count + 1;
  await supabase
    .from("usage_daily")
    .update({ message_count: next })
    .eq("user_id", userId)
    .eq("date", today);

  return next;
}
