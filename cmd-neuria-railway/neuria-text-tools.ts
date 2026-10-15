/** CMD NEURIA — safe, dependency-free text processing utilities. */
export function summarizeText(text: string, maxSentences = 3): string {
  if (typeof text !== "string" || text.length > 100_000) throw new Error("Texte invalide ou trop long");
  if (!Number.isInteger(maxSentences) || maxSentences < 1 || maxSentences > 10) throw new Error("Nombre de phrases invalide");
  const sentences = text.trim().match(/[^.!?\n]+(?:[.!?]+|$)/g)?.map(s => s.trim()).filter(Boolean) ?? [];
  if (sentences.length <= maxSentences) return text.trim();
  const tokens = (s: string) => (s.toLocaleLowerCase("fr").match(/[\p{L}\p{N}]{3,}/gu) ?? []);
  const counts = new Map<string, number>();
  for (const sentence of sentences) for (const word of new Set(tokens(sentence))) counts.set(word, (counts.get(word) ?? 0) + 1);
  const ranked = sentences.map((sentence, index) => ({ index, sentence,
    score: [...new Set(tokens(sentence))].reduce((sum, word) => sum + Math.log(1 + (counts.get(word) ?? 0)), 0) / Math.sqrt(1 + tokens(sentence).length) + (index === 0 ? 0.5 : 0) }));
  return ranked.sort((a, b) => b.score - a.score).slice(0, maxSentences).sort((a, b) => a.index - b.index).map(x => x.sentence).join(" ");
}
export function extractTasks(text: string): { task: string; done: boolean }[] {
  if (typeof text !== "string" || text.length > 100_000) throw new Error("Texte invalide ou trop long");
  return text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*(?:[-*]\s*)?\[([ xX])\]\s+(.+)$/);
    return match ? [{ task: match[2].trim(), done: match[1].toLowerCase() === "x" }] : [];
  }).slice(0, 250);
}
