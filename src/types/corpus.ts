/* ===== 语料来源条目（对应 JSON 原始数据） ===== */

/** 语料来源分类 */
export type CorpusCategoryType =
  | 'classical_poetry'
  | 'modern_literature'
  | 'idiom'
  | 'daily_corpus';

/** 原始语料条目 — 从 JSON 加载时的结构 */
export interface CorpusEntry {
  id: string;
  title?: string;
  text?: string;
  author?: string;
  dynasty?: string;
  source: string;
  type: CorpusCategoryType;
  content?: string;
  meaning?: string;
  pinyin?: string;
  tags: string[];
  difficulty?: number;
  wordCount?: number;
}

/* ===== 语料分类（用于 UI 分组展示） ===== */

export interface CorpusCategory {
  id: CorpusCategoryType;
  label: string;
  icon: string;
  description: string;
  count: number;
}

/* ===== 语料碎片（用于拼贴画布） ===== */

/** 词性标签 */
export type PosTag =
  | 'noun'       // 名词
  | 'verb'       // 动词
  | 'adj'        // 形容词
  | 'adv'        // 副词
  | 'location'   // 地点
  | 'time'       // 时间
  | 'emotion'    // 情感
  | 'nature'     // 自然
  | 'body'       // 身体
  | 'color'      // 颜色
  | 'number'     // 数字
  | 'name'       // 人名
  | 'other';     // 其他

/** 单个语料片段（可拖拽到画布上的最小单位） */
export interface CorpusFragment {
  id: string;
  text: string;
  source: string;
  author?: string;
  dynasty?: string;
  posTag?: PosTag;
  wordCount: number;
  tags: string[];
  corpusId: string;
  /** 所属的原文句子或诗句（用于上下文展示） */
  context?: string;
}

/** 语料库元数据 */
export interface Corpus {
  id: string;
  name: string;
  type: 'builtin' | 'imported' | 'crawled';
  category: CorpusCategoryType;
  description: string;
  language: 'zh' | 'en' | 'mixed';
  fragmentCount: number;
  tags: string[];
  version: string;
}

/* ===== 分词相关（供 tokenizer API 使用） ===== */

export interface TokenizedWord {
  word: string;
  pos: string;
  weight?: number;
}

export interface TokenizeResult {
  words: TokenizedWord[];
  text: string;
}
