"""
ClipPoems crawler API.

GET  /api/crawl/today    — 今日语料（合并已启用来源的最新爬取，无数据时返回 mock）
POST /api/crawl/run      — 手动触发爬取（框架调试用）
GET  /api/crawl/sources  — 列出已配置的爬取来源
"""

from typing import Optional

from fastapi import APIRouter, Query

from services import crawler

router = APIRouter(prefix="/api/crawl", tags=["crawl"])


@router.get("/today")
async def get_today(limit: int = Query(30, ge=1, le=100, description="返回碎片数量上限")):
    """获取今日语料。无真实爬取数据时返回预置 mock 兜底。"""
    return crawler.get_today(limit=limit)


@router.post("/run")
async def run_crawl(source: Optional[str] = Query(None, description="指定来源 id；为空则爬所有启用来源")):
    """手动触发爬取（框架调试用）。"""
    return crawler.run_crawl(source_id=source)


@router.get("/sources")
async def list_sources():
    """列出已配置的爬取来源。"""
    return {"sources": crawler.list_sources()}
