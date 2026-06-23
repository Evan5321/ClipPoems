import { generateId } from '@/lib/utils/id';
import type { CorpusEntry, CorpusFragment, Corpus, CorpusCategory } from '@/types/corpus';

// 直接导入 JSON 数据（运行时由 webpack 处理）
import poetryRaw from '@/../corpus-data/classical_poetry.json';
import idiomRaw from '@/../corpus-data/idioms.json';
import modernRaw from '@/../corpus-data/modern_literature.json';
import dailyRaw from '@/../corpus-data/daily_corpus.json';

/* ===== 语料分类定义 ===== */

export const CORPUS_CATEGORIES: CorpusCategory[] = [
  { id: 'classical_poetry', label: '古典诗词', icon: '📜', description: '唐诗、宋词、元曲等经典作品', count: 0 },
  { id: 'idiom',            label: '成语熟语', icon: '🔤', description: '常用成语和熟语', count: 0 },
  { id: 'modern_literature', label: '现代文学', icon: '📖', description: '近现代文学作品选段', count: 0 },
  { id: 'daily_corpus',     label: '日常语料', icon: '💬', description: '日常用语和口语表达', count: 0 },
];

/* ===== 语料库元数据 ===== */

export const BUILTIN_CORPORA: Corpus[] = [
  {
    id: 'classical_poetry',
    name: '古典诗词',
    type: 'builtin',
    category: 'classical_poetry',
    description: '从先秦到清代的经典诗词作品，涵盖唐诗、宋词、元曲等',
    language: 'zh',
    fragmentCount: 0,
    tags: ['唐诗', '宋词', '元曲', '古典', '诗歌'],
    version: '1.0.0',
  },
  {
    id: 'idiom',
    name: '成语熟语',
    type: 'builtin',
    category: 'idiom',
    description: '常用成语和熟语，包含释义和拼音',
    language: 'zh',
    fragmentCount: 0,
    tags: ['成语', '熟语', '四字词语'],
    version: '1.0.0',
  },
  {
    id: 'modern_literature',
    name: '现代文学',
    type: 'builtin',
    category: 'modern_literature',
    description: '近现代文学作品中的优美选段',
    language: 'zh',
    fragmentCount: 0,
    tags: ['现代', '文学', '散文', '小说'],
    version: '1.0.0',
  },
  {
    id: 'daily_corpus',
    name: '日常语料',
    type: 'builtin',
    category: 'daily_corpus',
    description: '日常生活用语和口语表达',
    language: 'zh',
    fragmentCount: 0,
    tags: ['日常', '口语', '生活'],
    version: '1.0.0',
  },
];

/* ===== 工具函数 ===== */

/** 推断词性标签 */
function inferPosTag(text: string, tags: string[]): CorpusFragment['posTag'] {
  const emotionTags = ['情感', '心情', '情绪', '爱情', '愁思', '喜悦', '愤怒'];
  const natureTags = ['自然', '山水', '月亮', '太阳', '星星', '风', '雨', '雪', '花', '草', '树'];
  const locationTags = ['地点', '地理', '山水', '江南', '边塞'];

  if (tags.some(t => emotionTags.includes(t))) return 'emotion';
  if (tags.some(t => natureTags.includes(t))) return 'nature';
  if (tags.some(t => locationTags.includes(t))) return 'location';
  return 'other';
}

/** 将古诗条目转换为碎片列表 */
function poemEntryToFragments(entry: CorpusEntry): CorpusFragment[] {
  const { title, author, dynasty, content, tags, source } = entry;
  if (!content || !title) return [];

  const lines = content.split(/[，。！？、；：\n]/).filter(s => s.trim().length > 0);

  const fullPoem: CorpusFragment = {
    id: generateId(),
    text: content,
    source: `${title} — ${author}`,
    author,
    dynasty,
    wordCount: content.length,
    tags: [...(tags || [])],
    corpusId: 'classical_poetry',
    context: `${title} · ${author}`,
  };

  const lineFragments: CorpusFragment[] = lines.map(line => ({
    id: generateId(),
    text: line.trim(),
    source: source || '古典诗词',
    author,
    dynasty,
    posTag: inferPosTag(line, tags || []),
    wordCount: line.trim().length,
    tags: [...(tags || [])],
    corpusId: 'classical_poetry',
    context: content,
  }));

  return [fullPoem, ...lineFragments];
}

/** 将成语条目转换为碎片 */
function idiomEntryToFragment(entry: CorpusEntry): CorpusFragment {
  return {
    id: generateId(),
    text: entry.text || '',
    source: entry.source || '成语词典',
    posTag: inferPosTag(entry.text || '', entry.tags || []),
    wordCount: entry.wordCount || entry.text?.length || 0,
    tags: [...(entry.tags || [])],
    corpusId: 'idiom',
    context: entry.meaning || '',
  };
}

/** 将现代文学条目转换为碎片 */
function modernEntryToFragments(entry: CorpusEntry): CorpusFragment[] {
  const { text, author, title, source, tags } = entry;
  if (!text) return [];

  const sentences = text.split(/[。！？；\n]/).filter(s => s.trim().length > 0);

  return sentences.map(sentence => ({
    id: generateId(),
    text: sentence.trim(),
    source: source || `${title || ''}${author ? ` — ${author}` : ''}`,
    author,
    posTag: inferPosTag(sentence, tags || []),
    wordCount: sentence.trim().length,
    tags: [...(tags || [])],
    corpusId: 'modern_literature',
    context: text,
  }));
}

/** 将日常语料条目转换为碎片 */
function dailyEntryToFragments(entry: CorpusEntry): CorpusFragment[] {
  return [{
    id: generateId(),
    text: entry.text || '',
    source: entry.source || '日常语料',
    posTag: inferPosTag(entry.text || '', entry.tags || []),
    wordCount: entry.wordCount || entry.text?.length || 0,
    tags: [...(entry.tags || [])],
    corpusId: 'daily_corpus',
  }];
}

/* ===== 主加载函数 ===== */

export type CorpusDataMap = Record<string, CorpusFragment[]>;

/** 加载并处理指定分类的语料数据 */
function loadCategory(
  rawData: unknown,
  categoryId: CorpusEntry['type'],
  toFragments: (entry: CorpusEntry) => CorpusFragment[] | CorpusFragment,
): CorpusFragment[] {
  const entries = rawData as CorpusEntry[];
  const fragments = entries.flatMap((entry) => {
    const corpusEntry: CorpusEntry = { ...entry, type: categoryId };
    const result = toFragments(corpusEntry);
    return Array.isArray(result) ? result : [result];
  });

  const idx = BUILTIN_CORPORA.findIndex((c) => c.id === categoryId);
  if (idx !== -1) BUILTIN_CORPORA[idx].fragmentCount = fragments.length;
  const catIdx = CORPUS_CATEGORIES.findIndex((c) => c.id === categoryId);
  if (catIdx !== -1) CORPUS_CATEGORIES[catIdx].count = fragments.length;

  return fragments;
}

/**
 * 加载所有内置语料数据并转换为碎片
 */
export async function loadAllCorpusData(): Promise<CorpusDataMap> {
  return {
    classical_poetry: loadCategory(poetryRaw, 'classical_poetry', (e) => poemEntryToFragments(e)),
    idiom:            loadCategory(idiomRaw, 'idiom', (e) => idiomEntryToFragment(e)),
    modern_literature: loadCategory(modernRaw, 'modern_literature', (e) => modernEntryToFragments(e)),
    daily_corpus:     loadCategory(dailyRaw, 'daily_corpus', (e) => dailyEntryToFragments(e)),
  };
}

/**
 * 搜索碎片
 */
export function searchFragments(
  data: CorpusDataMap,
  query: string,
  categoryId?: string,
): CorpusFragment[] {
  const q = query.toLowerCase();
  const sources = categoryId ? [categoryId] : Object.keys(data);
  const results: CorpusFragment[] = [];

  for (const key of sources) {
    const fragments = data[key] || [];
    for (const f of fragments) {
      if (
        f.text.toLowerCase().includes(q) ||
        (f.author && f.author.toLowerCase().includes(q)) ||
        f.tags.some(t => t.toLowerCase().includes(q)) ||
        (f.context && f.context.toLowerCase().includes(q))
      ) {
        results.push(f);
      }
    }
  }

  return results;
}