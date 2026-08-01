import type { TokenizeResult } from '@/types/corpus';

const CORPUS_SERVICE_URL =
  process.env.NEXT_PUBLIC_CORPUS_SERVICE_URL || 'http://localhost:8001';

/**
 * 调用 Python 分词服务进行中文分词
 * POST /api/tokenize → { text, words: [{word, pos, pos_label, weight?}], word_count }
 */
export async function tokenizeText(
  text: string,
  options?: { pos?: boolean; filterStopwords?: boolean; withWeight?: boolean },
): Promise<TokenizeResult> {
  try {
    const res = await fetch(`${CORPUS_SERVICE_URL}/api/tokenize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        pos: options?.pos ?? true,
        filter_stopwords: options?.filterStopwords ?? true,
        with_weight: options?.withWeight ?? false,
      }),
    });
    if (!res.ok) throw new Error(`Tokenize failed: ${res.status}`);
    const data = await res.json();
    return {
      words: data.words || [],
      text: data.text || text,
    };
  } catch (error) {
    console.error('Tokenizer service unavailable:', error);
    // 离线降级：按字拆分
    const words = Array.from(text).map((char) => ({
      word: char,
      pos: 'char',
      pos_label: '字',
    }));
    return { words, text };
  }
}

/**
 * 从语料服务获取推荐词汇
 * GET /api/corpus/recommend?seed=... → { seed_words, recommendations, total }
 */
export async function fetchRecommendedWords(
  seedWords?: string[],
): Promise<string[]> {
  try {
    const params = seedWords?.length ? `?seed=${seedWords.join(',')}` : '';
    const res = await fetch(
      `${CORPUS_SERVICE_URL}/api/corpus/recommend${params}`,
    );
    if (!res.ok) throw new Error(`Recommend failed: ${res.status}`);
    const data = await res.json();
    // API 返回 { recommendations: [{text, title, ...}] }
    const recs = data.recommendations || [];
    return recs.map((r: any) => r.text || r.title || '').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 通过语料服务搜索
 * GET /api/corpus/search?q=... → { query, results, total }
 */
export async function searchCorpusApi(
  query: string,
  options?: { category?: string; author?: string; limit?: number },
): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (options?.category) params.set('category', options.category);
    if (options?.author) params.set('author', options.author);
    if (options?.limit) params.set('limit', String(options.limit));

    const res = await fetch(
      `${CORPUS_SERVICE_URL}/api/corpus/search?${params.toString()}`,
    );
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Corpus search service unavailable:', error);
    return [];
  }
}
