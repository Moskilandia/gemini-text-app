const PRIMARY_MODEL = "gpt-5.2";
const FALLBACK_MODEL = "gpt-5.1";

export function getModelChain() {
  return [PRIMARY_MODEL, FALLBACK_MODEL];
}
