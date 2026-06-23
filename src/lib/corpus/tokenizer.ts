import type { TokenizeResult } from '@/types/corpus';

const CORPUS_SERVICE_URL =
  process.env.NEXT_PUBLIC_CORPUS_SERVICE_URL || 'http://localhost:8000';

/**
 * 调用 Python 分词服务进行中文分词
 */
export async function tokenizeText(text: string): Promise<TokenizeResult> {
  try {
    const res = await fetch(`${CORPUS_SERVICE_URL}/api/tokenize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Tokenize failed: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Tokenizer service unavailable:', error);
    // 离线降级：按字拆分
    const words = Array.from(text).map((char) => ({
      word: char,
      pos: 'char',
    }));
    return { words, text };
  }
}

/**
 * 从语料服务获取推荐词汇
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
    return data.words || [];
  } catch {
    return [];
  }
}
