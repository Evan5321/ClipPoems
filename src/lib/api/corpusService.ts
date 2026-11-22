/**
 * corpus-service 后端代理配置（服务端专用）
 *
 * 后端尚未开发，此文件只定义访问契约与转发能力：
 *  - 配置 CORPUS_SERVICE_URL 后，前端请求 /api/market/* 会被转发到后端
 *  - 未配置或后端不可用时，接口返回结构化的 503，前端自动降级为本地数据
 */

export const CORPUS_SERVICE_URL = (process.env.CORPUS_SERVICE_URL || '').replace(/\/+$/, '');

export function isCorpusServiceConfigured(): boolean {
  return CORPUS_SERVICE_URL.length > 0;
}

/**
 * 前端路径 → 后端路径映射。
 * 后端实现新接口时，在此登记即可，前端调用方式不用改。
 *
 * 契约：
 *  GET  /api/market/today          → GET  {backend}/api/crawl/today
 *  GET  /api/market/packs          → GET  {backend}/api/market/packs
 *  GET  /api/market/packs/{id}     → GET  {backend}/api/market/packs/{id}
 */
export function resolveUpstreamPath(segments: string[]): string | null {
  const [head, ...rest] = segments;
  if (!head) return null;
  if (head === 'today') return rest.length === 0 ? '/api/crawl/today' : null;
  if (head === 'packs') return ['/api/market/packs', ...rest].join('/');
  return null;
}

export const FORWARD_TIMEOUT_MS = 8000;
