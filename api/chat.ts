import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken } from "@clerk/backend";
import { getUserPlan } from "../shared/userPlan";
import { recordUsage } from "../shared/analytics";
import { logAuditEvent } from "../shared/audit";
import {
  ensureUser,
  getUserPlanDb,
  getDailyUsage,
} from "../shared/db";
import { addMessage } from "../shared/chatStoreDb";
import { supabase } from "../shared/supabaseServer";
import { incrementUsage } from "../shared/usageDaily";
import { getOrg } from "../shared/orgStore";


const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

const usageStore = new Map<
  string,
  { date: string; count: number }
>();
const DAILY_LIMIT_MAX = Number(process.env.DAILY_LIMIT ?? "0");

const PLAN_LIMITS = {
  free: {
    dailyMessages: 20,
    allowedDepths: ["quick"],
  },
  balanced: {
    dailyMessages: 200,
    allowedDepths: ["quick", "balanced"],
  },
  deep: {
    dailyMessages: Infinity,
    allowedDepths: ["quick", "balanced", "deep"],
  },
} as const;

type PlanTier = keyof typeof PLAN_LIMITS;

function getDailyLimitForPlan(planTier: PlanTier): number {
  const planLimit = PLAN_LIMITS[planTier].dailyMessages;

  if (Number.isFinite(DAILY_LIMIT_MAX) && DAILY_LIMIT_MAX > 0) {
    if (!Number.isFinite(planLimit)) return DAILY_LIMIT_MAX;
    return Math.min(planLimit, DAILY_LIMIT_MAX);
  }

  return planLimit;
}

function canSendMessage(userKey: string | undefined, limit: number): boolean {
  if (!Number.isFinite(limit) || limit <= 0) return true;

  const userId = (userKey ?? "").trim() || "anonymous";
  const today = new Date().toISOString().slice(0, 10);
  const usageKey = `${userId}:${today}`;
  const current = usageStore.get(usageKey);

  if (!current) {
    usageStore.set(usageKey, { date: today, count: 1 });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

const MODEL_CONFIG = {
  quick: {
    model: "gpt-4.1-mini",
    maxTokens: 500,
    temperature: 0.4,
  },
  balanced: {
    model: "gpt-4.1",
    maxTokens: 1000,
    temperature: 0.6,
  },
  deep: {
    model: "gpt-4.1",
    maxTokens: 2000,
    temperature: 0.8,
  },
} as const;

function useBestModel() {
  return MODEL_CONFIG.deep;
}

function isDeeperThanAllowed(requested: ModelTier, allowed: ModelTier): boolean {
  const order: ModelTier[] = ["quick", "balanced", "deep"];
  return order.indexOf(requested) > order.indexOf(allowed);
}

const tierUsageStore = new Map<
  string,
  {
    counts: Record<ModelTier, number>;
    resetAt: number;
  }
>();

const USAGE_WINDOW_MS = 60 * 60 * 1000;

const LIMITS: Record<ModelTier, number> = {
  quick: 20,
  balanced: 10,
  deep: 5,
};

function getClientKey(req: any): string {
  const forwarded = (req?.headers?.["x-forwarded-for"] || req?.headers?.["X-Forwarded-For"]) as
    | string
    | undefined;
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined;
  return ip || req?.socket?.remoteAddress || "anonymous";
}

function isRateLimited(key: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now >= current.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { limited: false, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ModelTier = "quick" | "balanced" | "deep";

function parseUserId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}


function checkAndIncrementUsage(key: string, tier: ModelTier): { allowed: boolean; limit: number } {
  const now = Date.now();
  const current = tierUsageStore.get(key);

  if (!current || now >= current.resetAt) {
    tierUsageStore.set(key, {
      counts: { quick: 0, balanced: 0, deep: 0 },
      resetAt: now + USAGE_WINDOW_MS,
    });
  }

  const entry = tierUsageStore.get(key)!;
  const limit = LIMITS[tier];

  if (entry.counts[tier] >= limit) {
    return { allowed: false, limit };
  }

  entry.counts[tier] += 1;
  return { allowed: true, limit };
}

function canSend(
  userKey: string | undefined,
  tier: ModelTier,
  planTier: PlanTier
): { allowed: boolean; reason?: "daily" | "tier"; limit?: number } {
  const dailyLimit = getDailyLimitForPlan(planTier);
  if (!canSendMessage(userKey, dailyLimit)) {
    return { allowed: false, reason: "daily" };
  }

  const usage = checkAndIncrementUsage(userKey || "anonymous", tier);
  if (!usage.allowed) {
    return { allowed: false, reason: "tier", limit: usage.limit };
  }

  return { allowed: true };
}

type ModelChoice = {
  provider: Provider;
  model: string;
  label: string;
};

const MODEL_MAP: Record<ModelTier, { primary: ModelChoice; fallback: ModelChoice }> = {
  quick: {
    primary: {
      provider: "openai",
      model: MODEL_CONFIG.quick.model,
      label: "GPT-4.1 Mini (Free)",
    },
    fallback: {
      provider: "google",
      model: "gemini-1.5-flash",
      label: "Gemini Flash",
    },
  },
  balanced: {
    primary: {
      provider: "openai",
      model: MODEL_CONFIG.balanced.model,
      label: "GPT-4.1",
    },
    fallback: {
      provider: "google",
      model: "gemini-1.5-pro",
      label: "Gemini Pro",
    },
  },
  deep: {
    primary: {
      provider: "openai",
      model: MODEL_CONFIG.deep.model,
      label: "GPT-4.1 (Premium)",
    },
    fallback: {
      provider: "google",
      model: "gemini-1.5-pro",
      label: "Gemini Pro",
    },
  },
};

function parseTier(value: unknown): ModelTier | undefined {
  if (value === "quick" || value === "balanced" || value === "deep") return value;
  return undefined;
}

function parseProvider(value: unknown): Provider | undefined {
  if (value === "openai" || value === "google" || value === "xai") return value;
  return undefined;
}

function normalizeKey(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^['\"]+/, "")
    .replace(/['\"]+$/, "");
}

function getBearerToken(req: any): string | undefined {
  const raw = (req?.headers?.authorization || req?.headers?.Authorization) as string | undefined;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return undefined;
  const token = trimmed.slice("bearer ".length).trim();
  return token || undefined;
}

async function getClerkUserIdFromRequest(req: any): Promise<string | undefined> {
  const token = getBearerToken(req);
  if (!token) return undefined;

  const secretKey = normalizeKey(process.env.CLERK_SECRET_KEY);
  const jwtKey = process.env.CLERK_JWT_KEY;

  try {
    const verified = await verifyToken(token, {
      ...(jwtKey ? { jwtKey } : {}),
      ...(secretKey ? { secretKey } : {}),
    });

    const sub = (verified as any)?.sub;
    return typeof sub === "string" && sub.trim() ? sub : undefined;
  } catch {
    return undefined;
  }
}

async function getClerkAuthFromRequest(
  req: any
): Promise<{ userId?: string; orgId?: string }> {
  const token = getBearerToken(req);
  if (!token) return {};

  const secretKey = normalizeKey(process.env.CLERK_SECRET_KEY);
  const jwtKey = process.env.CLERK_JWT_KEY;

  try {
    const verified = await verifyToken(token, {
      ...(jwtKey ? { jwtKey } : {}),
      ...(secretKey ? { secretKey } : {}),
    });

    const userId = typeof (verified as any)?.sub === "string" ? (verified as any).sub : undefined;
    const orgIdRaw = (verified as any)?.org_id ?? (verified as any)?.orgId;
    const orgId = typeof orgIdRaw === "string" ? orgIdRaw : undefined;

    return {
      userId: userId && userId.trim() ? userId : undefined,
      orgId: orgId && orgId.trim() ? orgId : undefined,
    };
  } catch {
    return {};
  }
}

function mapOrgPlanToTier(plan: unknown): PlanTier {
  if (plan === "business") return "deep";
  if (plan === "team") return "balanced";
  return "free";
}

function envEnabled(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  const v = String(raw).trim().toLowerCase();
  if (v === "") return defaultValue;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

const ENABLE_GROK = envEnabled("ENABLE_GROK", false);
const ENABLE_GEMINI_PRO = envEnabled("ENABLE_GEMINI_PRO", true);

function applyModelFlags(choice: ModelChoice): ModelChoice {
  // If Gemini Pro is disabled, downgrade to Flash.
  if (choice.provider === "google" && choice.model === "gemini-1.5-pro" && !ENABLE_GEMINI_PRO) {
    return { ...choice, model: "gemini-1.5-flash" };
  }

  return choice;
}

async function callProvider(args: {
  provider: Provider;
  model: string;
  input: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const { provider, model, input, temperature, maxTokens } = args;

  if (provider === "xai" && process.env.ENABLE_GROK !== "true") {
    throw new Error("Grok disabled");
  }

  if (provider === "openai") {
    const apiKey = normalizeKey(process.env.OPENAI_API_KEY);
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.responses.create({
      model,
      input,
      temperature,
      max_output_tokens: maxTokens,
    });

    return response.output_text;
  }

  if (provider === "google") {
    const apiKey = normalizeKey(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({ model });

    const result = await gemini.generateContent(input);
    return result.response.text();
  }

  if (provider === "xai") {
    throw new Error("Unsupported provider");
  }

  throw new Error("Unsupported provider");
}

const SYSTEM_PROMPT = `
You are a practical decision assistant.

Your role is to help users think clearly, plan effectively, and make informed decisions.
You prioritize clarity, structure, and usefulness over verbosity.

Guidelines:
- Ask clarifying questions when the request is ambiguous.
- Break complex problems into steps or options.
- Offer concise answers by default, with the option to go deeper if needed.
- Clearly state assumptions and uncertainties.
- Avoid unnecessary speculation or overconfidence.
- Be neutral, respectful, and supportive.

When appropriate:
- Suggest next steps.
- Provide examples.
- Summarize key points.

Your goal is to help the user move forward with confidence.
`;

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

function parseMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ChatMessage => {
        if (typeof item !== "object" || item === null) return false;
        if (!("role" in item) || !("content" in item)) return false;

        const role = (item as any).role;
        const content = (item as any).content;
        if (role !== "user" && role !== "assistant" && role !== "system") return false;
        if (typeof content !== "string") return false;

        return true;
      }
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

export default async function handler(
  req: any,
  res: any
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientKey = getClientKey(req);
  const rl = isRateLimited(clientKey);
  if (rl.limited) {
    res.setHeader("Retry-After", String(rl.retryAfterSeconds));
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: "Too many requests. Try again later.",
    });
  }

  try {
    const body = await readRequestBody(req);

    const { messages: rawMessages, chatId, requestedDepth } = (body as any) ?? {};

    const messages = parseMessages(rawMessages);
    if (messages.length === 0) {
      return res.status(400).json({ error: "Missing messages" });
    }

    const auth = await getClerkAuthFromRequest(req);
    const userId = auth.userId || parseUserId((body as any)?.userId) || "anonymous";
    const orgId = parseUserId((body as any)?.orgId);

    await ensureUser(userId);

    // Prefer org plan when an org is provided and the user is in that org.
    // Otherwise, prefer Supabase as the personal plan source; fall back to Clerk metadata.
    let tier: PlanTier = "free";

    if (orgId && auth.orgId && orgId === auth.orgId && userId !== "anonymous") {
      const org = await getOrg(orgId);
      if (org) tier = mapOrgPlanToTier(org.plan);
    }

    if (tier === "free") {
      tier = ((userId !== "anonymous" ? await getUserPlanDb(userId) : "free") as unknown) as PlanTier;
      if (userId !== "anonymous" && tier === "free") {
        const clerkPlan = await getUserPlan(userId);
        tier = (clerkPlan?.tier ?? tier) as PlanTier;
      }
    }

    const limits = PLAN_LIMITS[tier];

    const depthFromBody = parseTier(requestedDepth) ?? parseTier((body as any)?.tier) ?? "quick";

    const allowedDepths = limits.allowedDepths;
    if (!allowedDepths.includes(depthFromBody)) {
      await logAuditEvent({
        orgId: orgId ?? null,
        userId,
        actionType: "access.denied.plan",
        metadata: { requiredPlan: depthFromBody },
      });
      return res.status(403).json({
        error: "upgrade_required",
        message: "Upgrade your plan to use this reasoning depth.",
      });
    }

    const requestedTier: ModelTier = depthFromBody;

    const normalizedChatId = typeof chatId === "string" ? chatId.trim() : "";
    if (normalizedChatId) {
      const latestUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content;

      await supabase.from("chats").upsert(
        {
          id: normalizedChatId,
          user_id: userId,
          title: (latestUserMessage || "New chat").slice(0, 100),
        },
        { onConflict: "id" }
      );

      if (typeof latestUserMessage === "string" && latestUserMessage.trim()) {
        await addMessage(normalizedChatId, "user", latestUserMessage);
      }
    }

    // route to model based on requestedDepth
    const selected = MODEL_MAP[requestedTier];
    if (!selected) {
      return res.status(400).json({ error: "Invalid tier" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const usedToday = await getDailyUsage(userId, today);
    const dailyLimit = getDailyLimitForPlan(tier);
    if (Number.isFinite(dailyLimit) && dailyLimit > 0 && usedToday >= dailyLimit) {
      return res.status(429).json({
        error: "Daily limit reached",
        message: "Daily limit reached",
      });
    }

    const usageKey = userId === "anonymous" ? clientKey : userId;
    const gate = canSend(usageKey, requestedTier, tier);
    if (!gate.allowed) {
      if (gate.reason === "daily") {
        return res.status(429).json({
          error: "Daily limit reached",
          message: "Daily limit reached",
        });
      }

      return res.status(429).json({
        error: "Usage limit reached",
        message: `You've reached the ${requestedTier} usage limit. Try again later or upgrade.`,
        detail: `Too many ${requestedTier} requests. Try again later.`,
        tier: requestedTier,
        limit: gate.limit,
      });
    }

    const nextUsedToday = await incrementUsage(userId);

    recordUsage(userId, tier);

    await logAuditEvent({
      orgId: orgId ?? null,
      userId,
      actionType: `reasoning.used.${requestedTier}`, // quick | balanced | deep
    });

    // Note: Premium gating is handled client-side for now.

    const conversation = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages,
    ];

    const input = conversation
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    let text;
    const config = requestedTier === "deep" ? useBestModel() : MODEL_CONFIG[requestedTier];

    try {
      // generate response
      const primary = applyModelFlags(selected.primary);
      text = await callProvider({
        provider: primary.provider,
        model: primary.model,
        input,
        temperature: primary.provider === "openai" ? config.temperature : undefined,
        maxTokens: primary.provider === "openai" ? config.maxTokens : undefined,
      });
    } catch (err) {
      console.warn("Primary model failed, using fallback:", err);

      const fallback = applyModelFlags(selected.fallback);
      text = await callProvider({
        provider: fallback.provider,
        model: fallback.model,
        input,
        temperature: fallback.provider === "openai" ? config.temperature : undefined,
        maxTokens: fallback.provider === "openai" ? config.maxTokens : undefined,
      });
    }

    if (normalizedChatId) {
      await addMessage(normalizedChatId, "assistant", text || "");
    }

    return res.status(200).json({
      text: text || "",
      chatId: normalizedChatId || undefined,
      usage: {
        usedToday: nextUsedToday,
        dailyLimit: Number.isFinite(limits.dailyMessages) ? limits.dailyMessages : null,
        plan: tier,
      },
    });
  } catch (err: any) {
    console.error("API ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      detail: err?.message || String(err),
    });
  }
}
