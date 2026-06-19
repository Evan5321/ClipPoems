from fastapi import APIRouter

router = APIRouter(prefix="/api/corpus", tags=["corpus"])


@router.get("/search")
async def search(q: str = "", limit: int = 20):
    """Placeholder: Search corpus fragments."""
    return {"query": q, "results": []}


@router.get("/recommend")
async def recommend(keywords: str = ""):
    """Placeholder: Recommend related fragments."""
    return {"keywords": keywords, "recommendations": []}
