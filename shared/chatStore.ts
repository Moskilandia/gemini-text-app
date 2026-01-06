import { randomUUID } from "crypto";

export type Chat = {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
};

export type Message = {
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
};

const chats = new Map<string, Chat>();
const messages = new Map<string, Message[]>();

export function createChat(userId: string, firstMessage?: string) {
  const id = randomUUID();
  const chat: Chat = {
    id,
    userId,
    title: firstMessage?.slice(0, 40) || "New chat",
    createdAt: Date.now(),
  };
  chats.set(id, chat);
  messages.set(id, []);
  return chat;
}

export function ensureChat(chatId: string, userId: string, firstMessage?: string) {
  const id = chatId.trim();
  if (!id) {
    throw new Error("chatId is required");
  }

  const existing = chats.get(id);
  if (existing) {
    if (!messages.has(id)) messages.set(id, []);
    return existing;
  }

  const chat: Chat = {
    id,
    userId,
    title: firstMessage?.slice(0, 40) || "New chat",
    createdAt: Date.now(),
  };
  chats.set(id, chat);
  if (!messages.has(id)) messages.set(id, []);
  return chat;
}

export function listChats(userId?: string) {
  if (!userId) return [];
  return Array.from(chats.values())
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getMessages(chatId?: string) {
  if (!chatId) return [];
  return messages.get(chatId) || [];
}

export function addMessage(chatId: string, role: Message["role"], content: string) {
  const list = messages.get(chatId) || [];
  list.push({ chatId, role, content, createdAt: Date.now() });
  messages.set(chatId, list);
}
