from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["tokenize"])


@router.get("/tokenize")
async def tokenize(text: str):
    """Placeholder: Tokenize text using jieba."""
    return {"text": text, "tokens": []}
