/**
 * 语料市场后端访问层（客户端）
 *
 * 统一出口为同源 /api/market/*，由 route handler 转发到 corpus-service。
 * 后端未接入时返回 { ok: false }，调用方降级为本地预置数据，界面不报错。
 */
import type { CorpusFragment } from '@/types/corpus';
import { generateId } from '@/lib/utils/id';
import type { MarketCategory, MarketPack } from '@/data/market/packs';

export type ApiFailureReason = 'unconfigured' | 'unreachable' | 'invalid' | 'empty';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ApiFailureReason; message: string };

/* ===== 后端 DTO（与 corpus-service 约定的返回结构） ===== */

export interface TodayCorpusDto {
  date: string;
  source: string;
  /** 后端无真实爬取结果时返回 mock 示例数据 */
  from_mock?: boolean;
  fragments: Array<{
    id?: string;
    text: string;
    source?: string;
    author?: string;
    dynasty?: string;
    tags?: string[];
    context?: string;
    posTag?: CorpusFragment['posTag'];
    wordCount?: number;
    corpusId?: string;
  }>;
}

export interface MarketPackDto {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  gradient?: string;
  author?: string;
  downloads?: number;
  tags?: string[];
  fragments?: TodayCorpusDto['fragments'];
}

/** 语料包列表接口允许直接返回数组，或用 packs 包裹 */
export type MarketPackListDto = MarketPackDto[] | { packs: MarketPackDto[] };

export interface TodayCorpus {
  date: string;
  source: string;
  isMock: boolean;
  fragments: CorpusFragment[];
}

/* ===== 通用请求 ===== */

const FAILURE_MESSAGES: Record<ApiFailureReason, string> = {
  unconfigured: '语料服务尚未提供该接口',
  unreachable: '语料服务暂时不可用，请稍后重试',
  invalid: '语料服务返回数据格式异常',
  empty: '暂无内容',
};

async function requestJson<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/market/${path}`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const reason: ApiFailureReason =
        res.status === 404 || body?.error === 'CORPUS_SERVICE_NOT_CONFIGURED' ? 'unconfigured' : 'unreachable';
      return { ok: false, reason, message: FAILURE_MESSAGES[reason] };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, reason: 'unreachable', message: FAILURE_MESSAGES.unreachable };
  }
}

/* ===== DTO → 领域模型 ===== */

const VALID_CATEGORIES: MarketCategory[] = ['classical', 'modern', 'idiom', 'daily'];

function toFragment(
  item: NonNullable<TodayCorpusDto['fragments']>[number],
  fallbackSource: string,
): CorpusFragment {
  return {
    id: item.id || generateId(),
    text: item.text,
    source: item.source || fallbackSource,
    author: item.author,
    dynasty: item.dynasty,
    context: item.context,
    posTag: item.posTag,
    wordCount: item.wordCount ?? item.text.replace(/\s/g, '').length,
    tags: item.tags ?? [],
    corpusId: item.corpusId || 'market',
  };
}

function toMarketPack(dto: MarketPackDto): MarketPack {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    category: VALID_CATEGORIES.includes(dto.category as MarketCategory)
      ? (dto.category as MarketCategory)
      : 'daily',
    icon: dto.icon || '📦',
    gradient: dto.gradient || 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    author: dto.author,
    downloads: dto.downloads,
    tags: dto.tags ?? [],
    fragments: (dto.fragments ?? []).map((f) => toFragment(f, dto.name)),
  };
}

/* ===== 对外接口 ===== */

/** 今日语料（后端爬取产出） */
export async function fetchTodayCorpus(): Promise<ApiResult<TodayCorpus>> {
  const result = await requestJson<TodayCorpusDto>('today');
  if (!result.ok) return result;

  const dto = result.data;
  if (!dto || !Array.isArray(dto.fragments) || dto.fragments.length === 0) {
    return { ok: false, reason: 'empty', message: '今日暂无新语料' };
  }

  return {
    ok: true,
    data: {
      date: dto.date,
      source: dto.source,
      isMock: dto.from_mock ?? false,
      fragments: dto.fragments
        .filter((item) => item && typeof item.text === 'string' && item.text.trim())
        .map((item) => toFragment(item, dto.source || '网络爬取')),
    },
  };
}

/** 官方/在线语料包列表 */
export async function fetchMarketPacks(): Promise<ApiResult<MarketPack[]>> {
  const result = await requestJson<MarketPackListDto>('packs');
  if (!result.ok) return result;

  const list = Array.isArray(result.data) ? result.data : result.data?.packs;
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, reason: 'empty', message: '暂无语料包' };
  }

  const packs = list.filter((p) => p && p.id && p.name).map(toMarketPack);
  if (packs.length === 0) {
    return { ok: false, reason: 'invalid', message: FAILURE_MESSAGES.invalid };
  }
  return { ok: true, data: packs };
}
