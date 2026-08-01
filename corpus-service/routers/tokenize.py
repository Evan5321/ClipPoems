"""
ClipPoems tokenization API.

POST /api/tokenize      — Segment text with POS tags and weights
GET  /api/tokenize      — Same, via query param (for quick testing)
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from services.tokenizer import segment, segment_with_weight

router = APIRouter(prefix="/api", tags=["tokenize"])


class TokenizeRequest(BaseModel):
    text: str
    pos: bool = True
    filter_stopwords: bool = True
    with_weight: bool = False


class TokenizeResponse(BaseModel):
    text: str
    words: list[dict]
    word_count: int


@router.post("/tokenize", response_model=TokenizeResponse)
async def tokenize_post(req: TokenizeRequest):
    """Tokenize input text and return words with POS tags."""
    if not req.text or not req.text.strip():
        return TokenizeResponse(text=req.text, words=[], word_count=0)

    if req.with_weight:
        words = segment_with_weight(req.text, filter_stopwords=req.filter_stopwords)
    else:
        words = segment(req.text, pos=req.pos, filter_stopwords=req.filter_stopwords)

    return TokenizeResponse(
        text=req.text,
        words=words,
        word_count=len(words),
    )


@router.get("/tokenize", response_model=TokenizeResponse)
async def tokenize_get(
    text: str = Query(..., description="Text to tokenize"),
    pos: bool = Query(True, description="Include POS tags"),
    filter_stopwords: bool = Query(True, description="Filter stopwords"),
):
    """GET version of tokenize (convenient for testing)."""
    if not text.strip():
        return TokenizeResponse(text=text, words=[], word_count=0)

    words = segment(text, pos=pos, filter_stopwords=filter_stopwords)
    return TokenizeResponse(
        text=text,
        words=words,
        word_count=len(words),
    )
