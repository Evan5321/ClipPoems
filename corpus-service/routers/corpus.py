"""
ClipPoems corpus search & recommendation API.

GET /api/corpus/search    — Search corpus by keyword, author, tags
GET /api/corpus/recommend — Recommend related words based on seed keywords
"""

import json
import os
import random
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/corpus", tags=["corpus"])

# Load corpus data at startup
# Resolve path: corpus-service/routers/ → corpus-data/
_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.normpath(os.path.join(_dir, "..", ".."))
_data_dir = os.path.join(_project_root, "corpus-data")
print(f"[corpus] Project root: {_project_root}")
print(f"[corpus] Data dir: {_data_dir}")

# Cache loaded corpus entries
_corpus_cache: dict[str, list[dict]] = {}


def _load_json(filename: str) -> list[dict]:
    """Load a JSON corpus file, returning empty list on failure."""
    path = os.path.join(_data_dir, filename)
    if not os.path.isfile(path):
        print(f"[corpus] File not found: {path}")
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _ensure_loaded():
    """Load all corpus files into cache on first access."""
    if _corpus_cache:
        return
    files = {
        "classical_poetry": "classical_poetry.json",
        "idiom": "idioms.json",
        "modern_literature": "modern_literature.json",
        "daily_corpus": "daily_corpus.json",
    }
    for key, filename in files.items():
        data = _load_json(filename)
        _corpus_cache[key] = data
        print(f"[corpus] Loaded {key}: {len(data)} entries")


# Initialize on import
_ensure_loaded()


def _entry_text(entry: dict) -> str:
    """Get the main text content from a corpus entry."""
    return entry.get("content") or entry.get("text") or entry.get("meaning") or ""


def _entry_tags(entry: dict) -> list[str]:
    """Get tags from entry."""
    return entry.get("tags") or []


class SearchResult(BaseModel):
    id: str
    title: Optional[str] = None
    text: str
    author: Optional[str] = None
    dynasty: Optional[str] = None
    source: str
    type: str
    tags: list[str]
    score: float = 0.0


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    total: int


@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query("", description="Search keyword"),
    category: Optional[str] = Query(None, description="Filter by category"),
    author: Optional[str] = Query(None, description="Filter by author"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    limit: int = Query(30, ge=1, le=100, description="Max results"),
):
    """Search corpus entries by keyword, author, or tag."""
    if not q and not author and not tag:
        # Return all entries for the given category
        if category and category in _corpus_cache:
            entries = _corpus_cache[category][:limit]
        else:
            entries = []
            for cat_data in _corpus_cache.values():
                entries.extend(cat_data)
            entries = entries[:limit]
        return SearchResponse(
            query=q,
            results=[_entry_to_result(e) for e in entries],
            total=len(entries),
        )

    results: list[tuple[dict, float]] = []
    q_lower = q.lower().strip() if q else ""

    categories = [category] if category else list(_corpus_cache.keys())

    for cat in categories:
        entries = _corpus_cache.get(cat, [])
        for entry in entries:
            score = 0.0
            text = _entry_text(entry)
            tags = _entry_tags(entry)

            # Keyword match
            if q_lower:
                if q_lower in text.lower():
                    score += 1.0
                if q_lower in (entry.get("title") or "").lower():
                    score += 2.0
                if q_lower in (entry.get("author") or "").lower():
                    score += 1.5
                for tag in tags:
                    if q_lower in tag.lower():
                        score += 0.5

            # Author filter
            if author and author.lower() not in (entry.get("author") or "").lower():
                continue

            # Tag filter
            if tag and not any(tag.lower() in t.lower() for t in tags):
                continue

            if score > 0 or (not q_lower and not author and not tag):
                results.append((entry, score))

    # Sort by score descending
    results.sort(key=lambda x: -x[1])
    results = results[:limit]

    return SearchResponse(
        query=q,
        results=[_entry_to_result(e, s) for e, s in results],
        total=len(results),
    )


def _entry_to_result(entry: dict, score: float = 0.0) -> SearchResult:
    return SearchResult(
        id=entry.get("id", ""),
        title=entry.get("title"),
        text=_entry_text(entry)[:200],
        author=entry.get("author"),
        dynasty=entry.get("dynasty"),
        source=entry.get("source", ""),
        type=entry.get("type", ""),
        tags=_entry_tags(entry),
        score=score,
    )


class RecommendResponse(BaseModel):
    seed_words: list[str]
    recommendations: list[dict]
    total: int


@router.get("/recommend", response_model=RecommendResponse)
async def recommend(
    seed: str = Query("", description="Comma-separated seed words"),
    category: Optional[str] = Query(None, description="Limit to category"),
    count: int = Query(20, ge=1, le=50, description="Number of recommendations"),
):
    """
    Recommend related words/fragments based on seed keywords.

    Strategy: find entries containing seed words, then extract
    co-occurring words or return related entries.
    """
    seeds = [s.strip() for s in seed.split(",") if s.strip()]

    if not seeds:
        # No seeds: return random entries
        candidates = []
        cats = [category] if category else list(_corpus_cache.keys())
        for cat in cats:
            entries = _corpus_cache.get(cat, [])
            candidates.extend(entries)
        selected = random.sample(candidates, min(count, len(candidates)))
        return RecommendResponse(
            seed_words=seeds,
            recommendations=[_entry_to_result(e).model_dump() for e in selected],
            total=len(selected),
        )

    # Find entries that contain any seed word
    matched: list[dict] = []
    cats = [category] if category else list(_corpus_cache.keys())

    for cat in cats:
        for entry in _corpus_cache.get(cat, []):
            text = _entry_text(entry)
            title = entry.get("title", "")
            combined = (text + " " + title).lower()
            if any(s.lower() in combined for s in seeds):
                matched.append(entry)

    # Deduplicate
    seen_ids = set()
    unique = []
    for entry in matched:
        eid = entry.get("id", "")
        if eid not in seen_ids:
            seen_ids.add(eid)
            unique.append(entry)

    # Shuffle for variety
    random.shuffle(unique)
    selected = unique[:count]

    return RecommendResponse(
        seed_words=seeds,
        recommendations=[_entry_to_result(e).model_dump() for e in selected],
        total=len(selected),
    )
