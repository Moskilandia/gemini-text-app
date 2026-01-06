export function opsTierModifier(
  tier: "quick" | "balanced" | "deep"
) {
  switch (tier) {
    case "quick":
      return `
Respond briefly.
Clarify the core decision and the most immediate consideration.
Avoid detailed analysis.
`;

    case "balanced":
      return `
Provide structured reasoning.
Outline key options and tradeoffs.
Include resource or timing considerations where relevant.
`;

    case "deep":
      return `
Provide in-depth reasoning.
Analyze constraints, dependencies, and second-order effects.
Address risks, assumptions, and alignment with goals.
Include a short section on how this decision would hold up in review.
`;
  }
}
