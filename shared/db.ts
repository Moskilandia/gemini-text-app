import { supabase } from "./supabase";

export type PlanTier = "free" | "balanced" | "deep";

function toPlanTier(value: unknown): PlanTier {
  return value === "balanced" || value === "deep" ? value : "free";
}

export async function ensureUser(userId: string) {
  const { error } = await supabase
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
}

export async function getUserPlanDb(userId: string): Promise<PlanTier> {
  const { data, error } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return toPlanTier(data?.plan);
}

export async function setUserPlanDb(args: {
  userId: string;
  plan: PlanTier;
  stripeCustomerId?: string | null;
}) {
  const { error } = await supabase.from("users").upsert(
    {
      id: args.userId,
      plan: args.plan,
      ...(args.stripeCustomerId != null ? { stripe_customer_id: args.stripeCustomerId } : {}),
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
}

export async function downgradeUserToFreeByStripeCustomerId(stripeCustomerId: string) {
  const { error } = await supabase
    .from("users")
    .update({ plan: "free" })
    .eq("stripe_customer_id", stripeCustomerId);

  if (error) throw new Error(error.message);
}

export async function getDailyUsage(userId: string, date: string): Promise<number> {
  const { data, error } = await supabase
    .from("usage_daily")
    .select("message_count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return typeof data?.message_count === "number" ? data.message_count : 0;
}

export async function incrementDailyUsage(userId: string, date: string): Promise<number> {
  // Non-atomic but simple: read then write.
  const current = await getDailyUsage(userId, date);

  if (current === 0) {
    const { error: insertError } = await supabase
      .from("usage_daily")
      .insert({ user_id: userId, date, message_count: 1 });

    if (!insertError) return 1;
    // If insert races, fall through to update path.
  }

  const next = current + 1;
  const { error } = await supabase
    .from("usage_daily")
    .update({ message_count: next })
    .eq("user_id", userId)
    .eq("date", date);

  if (error) throw new Error(error.message);
  return next;
}

export type DbChat = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
};

export async function createChatDb(userId: string, title?: string) {
  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: userId, title: title ?? "New chat" })
    .select("id,user_id,title,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as DbChat;
}

export async function ensureChatDb(chatId: string, userId: string, title?: string) {
  const { error } = await supabase.from("chats").upsert(
    {
      id: chatId,
      user_id: userId,
      title: title ?? "New chat",
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
}

export async function listChatsDb(userId: string) {
  const { data, error } = await supabase
    .from("chats")
    .select("id,user_id,title,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbChat[];
}

export type DbMessage = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  created_at: string;
};

export async function addMessageDb(chatId: string, role: string, content: string) {
  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    role,
    content,
  });

  if (error) throw new Error(error.message);
}

export async function getMessagesDb(chatId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id,chat_id,role,content,created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbMessage[];
}
