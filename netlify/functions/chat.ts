import type { Handler } from "@netlify/functions";
import OpenAI from "openai";
import { verifyToken } from "@clerk/backend";
import { getUserPlan } from "../../shared/userPlan";
import { recordUsage } from "../../shared/analytics";

const tierUsageStore = new Map<string, number[]>();

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

type ModelTier = "quick" | "balanced" | "deep";

function checkAndIncrementUsage(
  key: string,
  tier: ModelTier
): { allowed: boolean; limit: number; used: number } {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const limit = LIMITS[tier];

  const storeKey = `${key}:${tier}`;
  const history = tierUsageStore.get(storeKey) || [];
  const recent = history.filter(t => now - t < windowMs);

  if (recent.length >= limit) {
    return { allowed: false, limit, used: recent.length };
  }

  recent.push(now);
  tierUsageStore.set(storeKey, recent);
  return { allowed: true, limit, used: recent.length };
}

function canSend(
  userKey: string | undefined,
  tier: ModelTier,
  planTier: PlanTier
):
  | { allowed: true; used: number; limit: number }
  | { allowed: false; reason: "daily" }
  | { allowed: false; reason: "tier"; used: number; limit: number } {
  const dailyLimit = getDailyLimitForPlan(planTier);
  if (!canSendMessage(userKey, dailyLimit)) {
    return { allowed: false, reason: "daily" };
  }

  const usage = checkAndIncrementUsage(userKey || "anonymous", tier);
  if (!usage.allowed) {
    return { allowed: false, reason: "tier", limit: usage.limit, used: usage.used };
  }

  return { allowed: true, limit: usage.limit, used: usage.used };
}

function normalizeKey(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^['\"]+/, "")
    .replace(/['\"]+$/, "");
}

function getBearerToken(headersLower: Record<string, string | undefined>): string | undefined {
  const raw = headersLower["authorization"];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return undefined;
  const token = trimmed.slice("bearer ".length).trim();
  return token || undefined;
}

async function getClerkUserIdFromHeaders(
  headersLower: Record<string, string | undefined>
): Promise<string | undefined> {
  const token = getBearerToken(headersLower);
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

const LIMITS: Record<string, number> = {
  quick: 20,
  balanced: 10,
  deep: 5,
};

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

type ReasoningMode = keyof typeof MODEL_CONFIG;

function isDeeperThanAllowed(requested: ReasoningMode, allowed: ReasoningMode): boolean {
  const order: ReasoningMode[] = ["quick", "balanced", "deep"];
  return order.indexOf(requested) > order.indexOf(allowed);
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};


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

function parseMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ChatMessage =>
        typeof item === "object" &&
        item !== null &&
        "role" in item &&
        "content" in item &&
        typeof (item as any).role === "string" &&
        typeof (item as any).content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const headersLower: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(event.headers || {})) {
    headersLower[k.toLowerCase()] = v;
  }

  try {
    const apiKeyRaw = process.env.OPENAI_API_KEY;
    const apiKey = (apiKeyRaw ?? "")
      .trim()
      .replace(/^['\"]+/, "")
      .replace(/['\"]+$/, "");

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const { messages, requestedDepth, tier: requestedTierRaw = "quick", userId: bodyUserId } = JSON.parse(
      event.body || "{}"
    );

    const clerkUserId = await getClerkUserIdFromHeaders(headersLower);
    const userId = clerkUserId || bodyUserId || "anonymous";

    const plan = userId !== "anonymous" ? await getUserPlan(userId) : undefined;
    const planTier = (plan?.tier ?? "free") as PlanTier;

    const limits = PLAN_LIMITS[planTier];

    const requestedDepthValue = (requestedDepth ?? requestedTierRaw) as unknown;
    const requestedDepthFinal =
      requestedDepthValue === "quick" ||
      requestedDepthValue === "balanced" ||
      requestedDepthValue === "deep"
        ? (requestedDepthValue as ModelTier)
        : undefined;

    if (!requestedDepthFinal) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid tier" }),
      };
    }

    const allowedDepths = limits.allowedDepths;
    if (!allowedDepths.includes(requestedDepthFinal)) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "upgrade_required",
          message: "Upgrade your plan to use this reasoning depth.",
        }),
      };
    }

    const identity =
      (userId && userId !== "anonymous" ? userId : undefined) ||
      headersLower["x-forwarded-for"] ||
      headersLower["client-ip"] ||
      "anonymous";

    // route to model based on requestedDepth
    const config =
      requestedDepthFinal === "deep" ? useBestModel() : MODEL_CONFIG[requestedDepthFinal];

    const gate = canSend(identity, requestedDepthFinal, planTier);
    if (!gate.allowed) {
      if (gate.reason === "daily") {
        return {
          statusCode: 429,
          body: JSON.stringify({
            error: "Daily limit reached",
            message: "Daily limit reached",
          }),
        };
      }

      return {
        statusCode: 429,
        body: JSON.stringify({
          error: "Usage limit reached",
          message: `You've reached the ${requestedDepthFinal} usage limit. Try again later or upgrade.`,
          tier: requestedDepthFinal,
          limit: gate.limit,
        }),
      };
    }


    recordUsage(userId, planTier);
    if (requestedDepthFinal === "deep") {
      // future: check auth / subscription
    }

    const parsedMessages = parseMessages(messages);
    if (parsedMessages.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing messages" }),
      };
    }

    const provider = (JSON.parse(event.body || "{}") as any)?.provider ?? "openai";
    if (provider !== "openai") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Unsupported provider",
          detail: "Only provider 'openai' is supported by this endpoint.",
        }),
      };
    }

    const openai = new OpenAI({ apiKey });
    const model = config.model;

    const conversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...parsedMessages,
    ];

    const input = conversation
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    // generate response
    const response = await openai.responses.stream({
      model,
      input,
      temperature: config.temperature,
      max_output_tokens: config.maxTokens,
    });

    const final = await response.finalResponse();
    const text = final.output_text || "";

    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `${identity}:${today}`;
    const record = usageStore.get(dailyKey);

    return {
      statusCode: 200,
      body: JSON.stringify({
        text,
        usage: {
          usedToday: record?.count ?? 0,
          dailyLimit: Number.isFinite(limits.dailyMessages) ? limits.dailyMessages : null,
          plan: planTier,
        },
      }),
    };
  } catch (err: any) {
    console.error("API ERROR:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server error",
        detail: err?.message || String(err),
      }),
    };
  }
};
