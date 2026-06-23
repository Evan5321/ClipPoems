import type { CorpusFragment } from '@/types/corpus';
import { searchFragments, type CorpusDataMap } from './loader';

export interface SearchOptions {
  query: string;
  categoryId?: string;
  minWordCount?: number;
  maxWordCount?: number;
  posTag?: string;
  author?: string;
}

/**
 * 高级搜索：在基础搜索上增加过滤条件
 */
export function advancedSearch(
  data: CorpusDataMap,
  options: SearchOptions,
): CorpusFragment[] {
  let results = searchFragments(data, options.query, options.categoryId);

  if (options.minWordCount !== undefined) {
    results = results.filter((f) => f.wordCount >= options.minWordCount!);
  }
  if (options.maxWordCount !== undefined) {
    results = results.filter((f) => f.wordCount <= options.maxWordCount!);
  }
  if (options.posTag) {
    results = results.filter((f) => f.posTag === options.posTag);
  }
  if (options.author) {
    results = results.filter(
      (f) => f.author && f.author.includes(options.author!),
    );
  }

  return results;
}

/**
 * 按标签筛选碎片
 */
export function filterByTag(
  data: CorpusDataMap,
  tag: string,
  categoryId?: string,
): CorpusFragment[] {
  const sources = categoryId ? [categoryId] : Object.keys(data);
  const results: CorpusFragment[] = [];

  for (const key of sources) {
    const fragments = data[key] || [];
    for (const f of fragments) {
      if (f.tags.some((t) => t.includes(tag))) {
        results.push(f);
      }
    }
  }

  return results;
}
