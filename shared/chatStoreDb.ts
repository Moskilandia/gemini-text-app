import { supabase } from "./supabaseServer";

export async function createChat(userId: string, title = "New chat") {
  const { data } = await supabase
    .from("chats")
    .insert({ user_id: userId, title })
    .select()
    .single();
  return data;
}

export async function listChats(userId: string) {
  const { data } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addMessage(chatId: string, role: string, content: string) {
  await supabase.from("messages").insert({
    chat_id: chatId,
    role,
    content,
  });
}

export async function getMessages(chatId: string) {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at");
  return data ?? [];
}
