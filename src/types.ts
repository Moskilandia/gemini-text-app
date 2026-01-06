type UserPlan = {
  userId: string
  tier: "free" | "balanced" | "deep"
  stripeCustomerId?: string
  subscriptionStatus?: "active" | "canceled"
}

export type { UserPlan };
