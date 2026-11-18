import type { CorpusFragment } from '@/types/corpus';
import { generateId } from '@/lib/utils/id';

/** 导入预览用的草稿碎片 */
export interface ImportedFragment {
  id: string;
  text: string;
  author?: string;
  source?: string;
  tags: string[];
}

export type ImportFormat = 'txt' | 'md' | 'csv';
export type SplitMode = 'line' | 'sentence' | 'paragraph';

/** 根据文件名判断格式 */
export function detectImportFormat(filename: string): ImportFormat {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return 'csv';
  if (ext === 'md' || ext === 'markdown') return 'md';
  return 'txt';
}

/** 清理 Markdown 标记 */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '');
}

/** 按模式切分纯文本 */
function splitText(text: string, mode: SplitMode): string[] {
  if (mode === 'paragraph') {
    return text
      .split(/\n\s*\n+/)
      .map((s) => s.replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean);
  }
  if (mode === 'sentence') {
    return text
      .split(/[。！？!?；;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // line
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 逐行切分 CSV（支持引号与转义） */
function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

/** 解析 CSV：自动识别表头（text/内容/词语、author/作者、source/来源、tags/标签） */
function parseCsv(content: string): ImportedFragment[] {
  const rows = parseCsvRows(content);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const findCol = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const textCol = findCol('text', 'content', '内容', '词句', '词语', '文本');
  const authorCol = findCol('author', '作者');
  const sourceCol = findCol('source', '来源', '出处');
  const tagsCol = findCol('tags', '标签', 'tag');
  const hasHeader = textCol >= 0;

  const body = hasHeader ? rows.slice(1) : rows;
  const startCol = hasHeader ? textCol : 0;

  return body
    .map((r) => {
      const text = (r[startCol] || '').trim();
      if (!text) return null;
      const tagsRaw = tagsCol >= 0 ? r[tagsCol] || '' : '';
      const tags = tagsRaw
        .split(/[|/、;；,]/)
        .map((t) => t.trim())
        .filter(Boolean);
      return {
        id: generateId(),
        text,
        author: authorCol >= 0 ? (r[authorCol] || '').trim() || undefined : undefined,
        source: sourceCol >= 0 ? (r[sourceCol] || '').trim() || undefined : undefined,
        tags,
      } as ImportedFragment;
    })
    .filter((x): x is ImportedFragment => !!x);
}

/**
 * 解析导入文件内容为碎片草稿
 */
export function parseImport(
  filename: string,
  content: string,
  options: { mode: SplitMode } = { mode: 'line' },
): ImportedFragment[] {
  const format = detectImportFormat(filename);
  let items: ImportedFragment[];

  if (format === 'csv') {
    items = parseCsv(content);
  } else {
    const cleaned = format === 'md' ? stripMarkdown(content) : content;
    items = splitText(cleaned, options.mode).map((text) => ({
      id: generateId(),
      text,
      tags: [] as string[],
      source: filename.replace(/\.[^.]+$/, ''),
    }));
  }

  // 去重 + 截断过长文本
  const seen = new Set<string>();
  return items
    .map((item) => ({ ...item, text: item.text.slice(0, 200) }))
    .filter((item) => {
      if (!item.text || seen.has(item.text)) return false;
      seen.add(item.text);
      return true;
    });
}

/** 草稿 → 语料碎片 */
export function draftsToFragments(
  drafts: ImportedFragment[],
  corpusId = 'custom_corpus',
): CorpusFragment[] {
  return drafts.map((d) => ({
    id: d.id,
    text: d.text,
    source: d.source || '自定义语料',
    author: d.author,
    wordCount: d.text.length,
    tags: d.tags,
    corpusId,
  }));
}
