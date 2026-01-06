import Stripe from "stripe";
import { getUserPlan as getUserPlanFromDb, setUserPlan as setUserPlanInDb } from "./planStore";

export type UserPlan = {
  userId: string;
  tier: "free" | "balanced" | "deep";
  status?: "active" | "canceled";
};

export type SaveUserPlanInput = {
  userId: string;
  tier: UserPlan["tier"];
  status: "active" | "canceled";
};

const USER_PLAN_CACHE_MS = 60_000;
const userPlanCache = new Map<string, { plan: UserPlan; cachedAt: number }>();

function normalizeKey(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^['\"]+/, "")
    .replace(/['\"]+$/, "");
}

function parseTier(value: unknown): UserPlan["tier"] | undefined {
  if (value === "free" || value === "balanced" || value === "deep") return value;
  return undefined;
}

async function clerkPatchUser(userId: string, publicMetadata: Record<string, unknown>) {
  const clerkSecret = normalizeKey(process.env.CLERK_SECRET_KEY);
  if (!clerkSecret) return;

  await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_metadata: publicMetadata }),
  });
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const trimmed = (userId ?? "").trim();
  if (!trimmed) return { userId: "", tier: "free" };

  const cached = userPlanCache.get(trimmed);
  const now = Date.now();
  if (cached && now - cached.cachedAt < USER_PLAN_CACHE_MS) return cached.plan;

  try {
    const tier = parseTier(await getUserPlanFromDb(trimmed)) ?? "free";

    const plan: UserPlan = { userId: trimmed, tier };
    userPlanCache.set(trimmed, { plan, cachedAt: now });
    return plan;
  } catch {
    const plan = { userId: trimmed, tier: "free" as const };
    userPlanCache.set(trimmed, { plan, cachedAt: now });
    return plan;
  }
}

export async function saveUserPlan(userId: string, tier: UserPlan["tier"]): Promise<void>;
export async function saveUserPlan(input: SaveUserPlanInput): Promise<void>;
export async function saveUserPlan(
  userIdOrInput: string | SaveUserPlanInput,
  tierArg?: UserPlan["tier"]
) {
  const input: SaveUserPlanInput =
    typeof userIdOrInput === "string"
      ? {
          userId: userIdOrInput,
          tier: tierArg ?? "free",
          status: (tierArg ?? "free") === "free" ? "canceled" : "active",
        }
      : userIdOrInput;

  const trimmed = (input.userId ?? "").trim();
  if (!trimmed) return;

  const now = Date.now();
  const plan: UserPlan = { userId: trimmed, tier: input.tier, status: input.status };
  userPlanCache.set(trimmed, { plan, cachedAt: now });

  await setUserPlanInDb(trimmed, input.tier);

  await clerkPatchUser(trimmed, {
    isPremium: input.tier !== "free",
    planTier: input.tier,
    subscriptionStatus: input.status,
  });
}

export async function downgradeUserToFree(customerId: string) {
  const secret = normalizeKey(process.env.STRIPE_SECRET_KEY);
  if (!secret) return;

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) return;

  // Preferred: customer metadata contains userId.
  const metaUserId = (customer as Stripe.Customer).metadata?.userId;
  if (metaUserId) {
    await saveUserPlan({ userId: metaUserId, tier: "free", status: "canceled" });
    await clerkPatchUser(metaUserId, { stripeCustomerId: customerId });
    return;
  }

  // Fallback: find the latest checkout session for this customer.
  try {
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 1,
    });

    const session = sessions.data?.[0];
    const sessionUserId = session?.client_reference_id;
    if (sessionUserId) {
      await saveUserPlan({ userId: sessionUserId, tier: "free", status: "canceled" });
      await clerkPatchUser(sessionUserId, { stripeCustomerId: customerId });
    }
  } catch {
    // ignore
  }
}
