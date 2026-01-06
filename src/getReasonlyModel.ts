export function getReasonlyModel() {
  return process.env.OPENAI_MODEL || "gpt-5.2";
}
