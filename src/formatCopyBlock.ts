export function formatCopyBlock(text: string) {
  return text
    .replace(/\*\*/g, "") // remove markdown bold
    .replace(/#+\s/g, "") // remove markdown headers
    .trim();
}
