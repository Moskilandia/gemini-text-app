export type ModelOption = {
  id: string;
  label: string;
  provider: "openai" | "google" | "xai";
  tier: "quick" | "balanced" | "deep" | "premium";
  description: string;
  badge?: string; // shown as a chip
  disabled?: boolean;
};

export type ModelTier = ModelOption["tier"];

export type SupportedModelTier = Exclude<ModelTier, "premium">;

export const MODEL_MAP: Record<
  SupportedModelTier,
  { provider: ModelOption["provider"]; model: string; label: string }
> = {
  quick: {
    provider: "openai",
    model: "gpt-4o-mini",
    label: "Quick (Free)",
  },
  balanced: {
    provider: "openai",
    model: "gpt-4o",
    label: "Balanced",
  },
  deep: {
    provider: "openai",
    model: "gpt-4o",
    label: "Deep (Premium)",
  },
};

export const MODELS: ModelOption[] = [
  {
    id: "gpt-4o-mini",
    label: "Quick",
    provider: "openai",
    tier: "quick",
    description: "Fast answers for everyday questions and drafts.",
    badge: "Free",
  },
  {
    id: "gpt-4o",
    label: "Balanced",
    provider: "openai",
    tier: "balanced",
    description: "Better reasoning for planning and comparisons.",
  },
  {
    id: "gpt-4o",
    label: "Deep",
    provider: "openai",
    tier: "deep",
    description: "Deeper analysis for complex decisions.",
    badge: "Premium",
  },
  {
    id: "grok-2",
    label: "Deep (Grok)",
    provider: "xai",
    tier: "premium",
    description: "Advanced conversational reasoning (coming soon).",
    badge: "Coming Soon",
    disabled: true,
  },
];
