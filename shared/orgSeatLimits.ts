export const ORG_SEAT_LIMITS = {
  team: 5,
  business: 20,
  enterprise: Infinity,
} as const;

export type OrgPlan = keyof typeof ORG_SEAT_LIMITS;
