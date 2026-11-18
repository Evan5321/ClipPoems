"""
ClipPoems web crawler framework.

可扩展的多源爬取引擎：
- 来源配置化（config/crawler_sources.json），新增来源只需改配置
- httpx 抓取 HTML → beautifulsoup4 按 selector 提取正文 → 清洗 → 分句切分
- 产出对齐前端 CorpusFragment 格式的碎片
- 爬取结果落盘到 data/crawled/{source}/{date}.json
- 「今日语料」合并各来源最新爬取；无真实数据时返回 mock 兜底

注意：爬取源网站待定，本模块先提供框架 + mock 兜底。
"""

import json
import os
import re
import uuid
from datetime import date
from typing import Optional

import httpx
from bs4 import BeautifulSoup

_dir = os.path.dirname(os.path.abspath(__file__))
_service_root = os.path.normpath(os.path.join(_dir, ".."))
_config_dir = os.path.join(_service_root, "config")
_data_dir = os.path.join(_service_root, "data")
_crawled_dir = os.path.join(_data_dir, "crawled")
_mock_today_path = os.path.join(_data_dir, "mock_today.json")
_sources_path = os.path.join(_config_dir, "crawler_sources.json")

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

# 中文分句标点
_SENTENCE_SPLIT_RE = re.compile(r"[。！？!?；;]+")
# 合并多余空白
_WS_RE = re.compile(r"\s+")


def _ensure_dirs() -> None:
    os.makedirs(_crawled_dir, exist_ok=True)
    os.makedirs(_config_dir, exist_ok=True)


_ensure_dirs()


# ===== 配置 =====

def load_sources() -> list[dict]:
    """加载爬取源配置。文件不存在或为空时返回空列表。"""
    if not os.path.isfile(_sources_path):
        return []
    try:
        with open(_sources_path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("sources", []) if isinstance(data, dict) else []
    except Exception as e:
        print(f"[crawler] Failed to load sources config: {e}")
        return []


def list_sources() -> list[dict]:
    """对外暴露的来源列表（精简字段）。"""
    sources = load_sources()
    return [
        {
            "id": s.get("id"),
            "name": s.get("name"),
            "enabled": s.get("enabled", False),
            "tags": s.get("tags", []),
            "url_count": len(s.get("urls", [])),
        }
        for s in sources
    ]


# ===== 抓取与提取 =====

def fetch_html(url: str, timeout: float = 15.0) -> str:
    """抓取 URL 的 HTML 文本。失败抛异常。"""
    resp = httpx.get(url, headers=DEFAULT_HEADERS, timeout=timeout, follow_redirects=True)
    resp.raise_for_status()
    # 尝试从响应头或 meta 推断编码，兜底 utf-8
    resp.encoding = resp.charset_encoding or "utf-8"
    return resp.text


def extract_text(html: str, content_selector: Optional[str] = None) -> tuple[str, str]:
    """
    从 HTML 提取正文文本与标题。

    Args:
        html: 原始 HTML
        content_selector: 正文 CSS 选择器；为空时启发式提取（取最长文本块）

    Returns:
        (title, text)
    """
    soup = BeautifulSoup(html, "html.parser")

    # 移除噪音标签
    for tag in soup(["script", "style", "noscript", "iframe", "svg", "form"]):
        tag.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    nodes = []
    if content_selector:
        nodes = soup.select(content_selector)
    if not nodes:
        # 启发式：取文本最多的 article/main 或 body
        for candidate in ["article", "main", '[role="main"]']:
            found = soup.select(candidate)
            if found:
                nodes = found
                break
    if not nodes:
        nodes = [soup.body] if soup.body else [soup]

    texts: list[str] = []
    for node in nodes:
        if node is None:
            continue
        # 按块级元素分行，避免文字粘连
        for br in node.find_all("br"):
            br.replace_with("\n")
        for block in node.find_all(["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"]):
            block.append("\n")
        texts.append(node.get_text())

    text = "\n".join(texts)
    text = clean_text(text)
    return title, text


def clean_text(text: str) -> str:
    """清洗：去零宽字符、合并空白、去除纯符号短行。"""
    text = text.replace("\u200b", "").replace("\u3000", " ")
    text = _WS_RE.sub(" ", text)
    lines = [ln.strip() for ln in text.splitlines()]
    # 过滤过短或纯标点的行
    cleaned = [ln for ln in lines if len(ln) >= 2 and re.search(r"[\u4e00-\u9fa5A-Za-z0-9]", ln)]
    return "\n".join(cleaned).strip()


# ===== 切分 =====

def split_into_fragments(text: str, mode: str = "sentence", min_len: int = 2, max_len: int = 40) -> list[str]:
    """
    将正文切分为碎片。

    mode:
        - "sentence": 按中文句末标点分句（默认）
        - "line": 按行切分
        - "paragraph": 按空行分段（这里文本已被 clean 合并，退化为按行）
    """
    if not text:
        return []

    if mode == "line":
        raw = [ln.strip() for ln in text.splitlines()]
    elif mode == "paragraph":
        raw = [p.strip() for p in re.split(r"\n\s*\n", text)]
    else:  # sentence
        raw = [s.strip() for s in _SENTENCE_SPLIT_RE.split(text)]

    fragments: list[str] = []
    for piece in raw:
        piece = piece.strip(" ，,。、；;：:！？!?\"'“”‘’()（）[]【】")
        if not piece:
            continue
        if len(piece) < min_len:
            continue
        # 过长则按逗号再切一刀
        if len(piece) > max_len:
            for sub in re.split(r"[，,、]", piece):
                sub = sub.strip()
                if min_len <= len(sub) <= max_len:
                    fragments.append(sub)
        else:
            fragments.append(piece)
    return fragments


def _to_fragment(text: str, source_name: str, url: str, tags: list[str], author: str = "") -> dict:
    """构造对齐前端 CorpusFragment 的碎片对象。"""
    return {
        "id": str(uuid.uuid4()),
        "text": text,
        "source": source_name,
        "author": author or "",
        "posTag": "other",
        "wordCount": len(text),
        "tags": list(tags),
        "corpusId": "crawled_today",
        "context": url,
    }


# ===== 爬取执行 =====

def crawl_source(source: dict, limit: int = 50) -> dict:
    """
    抓取单个来源，返回爬取结果并落盘。

    Returns:
        {source, url_count, fragment_count, fragments, date, error}
    """
    source_id = source.get("id") or "unknown"
    source_name = source.get("name") or source_id
    urls = source.get("urls", [])
    selector = source.get("content_selector")
    split_mode = source.get("split_mode", "sentence")
    tags = source.get("tags", [])
    author = source.get("author", "")

    all_fragments: list[dict] = []
    errors: list[str] = []

    for url in urls:
        try:
            html = fetch_html(url)
            title, text = extract_text(html, selector)
            pieces = split_into_fragments(text, mode=split_mode)
            for piece in pieces[:limit]:
                all_fragments.append(_to_fragment(piece, source_name, url, tags, author))
        except Exception as e:
            errors.append(f"{url}: {e}")
            print(f"[crawler] Error crawling {url}: {e}")

    result = {
        "source": source_id,
        "source_name": source_name,
        "url_count": len(urls),
        "fragment_count": len(all_fragments),
        "fragments": all_fragments,
        "date": date.today().isoformat(),
        "errors": errors,
    }
    _save_crawled(source_id, result)
    return result


def _crawled_file(source_id: str, day: Optional[str] = None) -> str:
    day = day or date.today().isoformat()
    src_dir = os.path.join(_crawled_dir, source_id)
    os.makedirs(src_dir, exist_ok=True)
    return os.path.join(src_dir, f"{day}.json")


def _save_crawled(source_id: str, result: dict) -> None:
    path = _crawled_file(source_id, result.get("date"))
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[crawler] Failed to save crawl result: {e}")


def _load_crawled(source_id: str, day: Optional[str] = None) -> Optional[dict]:
    path = _crawled_file(source_id, day)
    if not os.path.isfile(path):
        # 回退到最近有数据的一天
        src_dir = os.path.join(_crawled_dir, source_id)
        if not os.path.isdir(src_dir):
            return None
        files = sorted([f for f in os.listdir(src_dir) if f.endswith(".json")], reverse=True)
        if not files:
            return None
        path = os.path.join(src_dir, files[0])
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


# ===== 今日语料 =====

def _load_mock_today() -> list[dict]:
    if not os.path.isfile(_mock_today_path):
        return []
    try:
        with open(_mock_today_path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("fragments", []) if isinstance(data, dict) else []
    except Exception as e:
        print(f"[crawler] Failed to load mock today: {e}")
        return []


def get_today(limit: int = 30) -> dict:
    """
    获取今日语料：合并所有启用来源的最新爬取；无真实数据时返回 mock 兜底。

    Returns:
        {date, from_mock, source, fragments}
    """
    sources = [s for s in load_sources() if s.get("enabled")]
    fragments: list[dict] = []
    used_sources: list[str] = []

    for src in sources:
        result = _load_crawled(src.get("id", ""))
        if result and result.get("fragments"):
            fragments.extend(result["fragments"])
            used_sources.append(result.get("source_name") or src.get("id", ""))

    if fragments:
        return {
            "date": date.today().isoformat(),
            "from_mock": False,
            "source": "、".join(used_sources) or "crawled",
            "fragments": fragments[:limit],
        }

    # 兜底：返回 mock
    mock = _load_mock_today()
    return {
        "date": date.today().isoformat(),
        "from_mock": True,
        "source": "mock",
        "fragments": mock[:limit],
    }


def run_crawl(source_id: Optional[str] = None) -> dict:
    """手动触发爬取。指定 source_id 则只爬该来源，否则爬所有启用来源。"""
    sources = load_sources()
    if source_id:
        sources = [s for s in sources if s.get("id") == source_id]
    else:
        sources = [s for s in sources if s.get("enabled")]

    if not sources:
        return {"ran": 0, "message": "没有已启用的爬取来源（请先在 config/crawler_sources.json 配置并启用）"}

    results = []
    for src in sources:
        results.append(crawl_source(src))
    return {
        "ran": len(results),
        "total_fragments": sum(r.get("fragment_count", 0) for r in results),
        "results": [
            {"source": r["source"], "fragments": r["fragment_count"], "errors": r.get("errors", [])}
            for r in results
        ],
    }
