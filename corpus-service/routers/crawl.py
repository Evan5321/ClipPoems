from fastapi import APIRouter

router = APIRouter(prefix="/api/crawl", tags=["crawl"])


@router.post("/")
async def crawl_url(url: str):
    """Placeholder: Crawl and clean text from URL."""
    return {"url": url, "status": "not_implemented"}
