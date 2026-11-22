import { NextRequest, NextResponse } from 'next/server';
import {
  CORPUS_SERVICE_URL,
  FORWARD_TIMEOUT_MS,
  isCorpusServiceConfigured,
  resolveUpstreamPath,
} from '@/lib/api/corpusService';

export const dynamic = 'force-dynamic';

/**
 * 语料市场统一出口：/api/market/*
 * 后端未接入时返回 503 + 结构化错误码，前端据此降级为本地预置数据。
 */
async function handle(req: NextRequest, { params }: { params: { path: string[] } }) {
  const segments = params.path ?? [];
  const upstreamPath = resolveUpstreamPath(segments);

  if (!upstreamPath) {
    return NextResponse.json(
      { error: 'UNKNOWN_MARKET_ENDPOINT', message: `未知的语料市场接口：/${segments.join('/')}` },
      { status: 404 },
    );
  }

  if (!isCorpusServiceConfigured()) {
    return NextResponse.json(
      {
        error: 'CORPUS_SERVICE_NOT_CONFIGURED',
        message: '未配置 CORPUS_SERVICE_URL，语料服务尚未接入',
      },
      { status: 503 },
    );
  }

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  try {
    const upstream = await fetch(`${CORPUS_SERVICE_URL}${upstreamPath}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: 'CORPUS_SERVICE_UNAVAILABLE',
        message: '语料服务暂时不可用，请稍后重试',
      },
      { status: 502 },
    );
  }
}

export { handle as GET, handle as POST };
