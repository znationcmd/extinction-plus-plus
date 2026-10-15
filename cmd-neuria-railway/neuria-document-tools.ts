/** CMD NEURIA: deterministic, offline document comparison tools. */
export function compareDocuments(left: string, right: string) {
  if (typeof left !== "string" || typeof right !== "string" || left.length > 100000 || right.length > 100000)
    throw new Error("Documents invalides ou trop longs");
  const a = left.replace(/\r\n/g, "\n").split("\n");
  const b = right.replace(/\r\n/g, "\n").split("\n");
  const count = (lines: string[]) => {
    const m = new Map<string, number>();
    for (const line of lines) m.set(line, (m.get(line) ?? 0) + 1);
    return m;
  };
  const leftCounts = count(a), rightCounts = count(b);
  const removed = a.filter(line => { const n = rightCounts.get(line) ?? 0; if (n > 0) { rightCounts.set(line, n - 1); return false; } return true; });
  const added = b.filter(line => { const n = leftCounts.get(line) ?? 0; if (n > 0) { leftCounts.set(line, n - 1); return false; } return true; });
  return { equal: left === right, leftLines: a.length, rightLines: b.length, addedCount: added.length, removedCount: removed.length,
    added: added.slice(0, 250), removed: removed.slice(0, 250), truncated: added.length > 250 || removed.length > 250 };
}
export function analyzeDocument(text: string) {
  if (typeof text !== "string" || text.length > 100000) throw new Error("Document invalide");
  const words = text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? [];
  const paragraphs = text.split(/\n\s*\n/).filter(s => s.trim());
  const headings = text.split(/\r?\n/).filter(s => /^#{1,6}\s+\S/.test(s)).map(s => s.replace(/^#{1,6}\s+/, "")).slice(0, 100);
  return { characters: [...text].length, words: words.length, paragraphs: paragraphs.length, lines: text.split(/\r?\n/).length,
    headings, estimatedReadingMinutes: Math.ceil(words.length / 200) };
}
