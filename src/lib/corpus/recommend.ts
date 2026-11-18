import type { CorpusFragment } from '@/types/corpus';

/**
 * 本地关联词推荐（Python 分词服务不可用时的降级实现）
 * 依据：共享汉字、共同标签、同一作者
 */
export function recommendRelated(
  seeds: string[],
  pool: CorpusFragment[],
  count = 12,
): CorpusFragment[] {
  const seedTexts = seeds.map((s) => s.trim()).filter(Boolean);
  if (seedTexts.length === 0) return [];

  const seedChars = new Set<string>();
  const seedTags = new Set<string>();
  for (const s of seedTexts) {
    for (const ch of s) seedChars.add(ch);
  }
  const seedFragments = pool.filter((f) => seedTexts.includes(f.text));
  for (const f of seedFragments) f.tags.forEach((t) => seedTags.add(t));

  const scored = pool
    .filter((f) => !seedTexts.includes(f.text))
    .map((f) => {
      let score = 0;
      const chars = new Set(f.text);
      chars.forEach((c) => {
        if (seedChars.has(c)) score += 2;
      });
      f.tags.forEach((t) => {
        if (seedTags.has(t)) score += 3;
      });
      if (seedFragments.some((s) => s.author && f.author && s.author === f.author)) score += 2;
      // 短词更适合拼贴
      if (f.text.length <= 4) score += 1;
      return { fragment: f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const result: CorpusFragment[] = [];
  for (const { fragment } of scored) {
    if (seen.has(fragment.text)) continue;
    seen.add(fragment.text);
    result.push(fragment);
    if (result.length >= count) break;
  }
  return result;
}
