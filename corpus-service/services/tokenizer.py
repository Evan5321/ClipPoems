"""
ClipPoems jieba tokenization wrapper.

Handles:
- jieba initialisation with custom dictionary
- Word segmentation with POS tagging
- Stopwords filtering
- Keyword extraction
"""

import os
import jieba
import jieba.posseg as pseg
import jieba.analyse

_dir = os.path.dirname(os.path.abspath(__file__))
_data_dir = os.path.join(_dir, "..", "data")

# Paths
USER_DICT = os.path.join(_data_dir, "user_dict.txt")
STOPWORDS = os.path.join(_data_dir, "stopwords.txt")

# Loaded stopwords set
_stopwords: set[str] = set()

# Initialise jieba
jieba.initialize()


def _load_dict() -> None:
    """Load custom dictionary if file exists and is not empty."""
    if os.path.isfile(USER_DICT) and os.path.getsize(USER_DICT) > 0:
        jieba.load_userdict(USER_DICT)
        print(f"[tokenizer] Loaded custom dictionary: {USER_DICT}")


def _load_stopwords() -> set[str]:
    """Load stopwords from file."""
    words: set[str] = set()
    if os.path.isfile(STOPWORDS):
        with open(STOPWORDS, encoding="utf-8") as f:
            for line in f:
                word = line.strip()
                if word and not word.startswith("#"):
                    words.add(word)
    return words


# Load on import
_load_dict()
_stopwords = _load_stopwords()


# POS mapping: jieba pos → human-readable Chinese label
POS_LABELS: dict[str, str] = {
    "n":    "名词",  "nr":   "人名",   "ns":   "地名",
    "nt":   "机构",  "nz":   "其他专名", "v":   "动词",
    "vd":   "副动词", "vn":   "名动词", "a":   "形容词",
    "ad":   "副形词", "an":   "名形词", "d":   "副词",
    "m":    "数词",  "q":    "量词",   "p":   "介词",
    "c":    "连词",  "u":    "助词",   "xc":  "其他虚词",
    "w":    "标点",  "x":    "未知",
}


def segment(text: str, pos: bool = True, filter_stopwords: bool = True) -> list[dict]:
    """
    Tokenize Chinese text.

    Args:
        text: Input Chinese text.
        pos: Whether to include POS tags.
        filter_stopwords: Whether to filter out stopwords.

    Returns:
        List of dicts: [{word, pos, pos_label, weight?}, ...]
    """
    if not text or not text.strip():
        return []

    words: list[dict] = []

    if pos:
        for w in pseg.cut(text):
            word = w.word.strip()
            if not word:
                continue
            if filter_stopwords and word in _stopwords:
                continue
            entry: dict = {
                "word": word,
                "pos": w.flag,
                "pos_label": POS_LABELS.get(w.flag, "其他"),
            }
            words.append(entry)
    else:
        for w in jieba.cut(text):
            word = w.strip()
            if not word:
                continue
            if filter_stopwords and word in _stopwords:
                continue
            words.append({"word": word, "pos": "", "pos_label": ""})

    return words


def segment_with_weight(
    text: str,
    top_k: int = 20,
    filter_stopwords: bool = True,
) -> list[dict]:
    """
    Tokenize with TF-IDF keyword weights.

    Returns:
        List of dicts: [{word, pos, pos_label, weight}, ...]
    """
    if not text or not text.strip():
        return []

    # Get base segmentation
    words = segment(text, pos=True, filter_stopwords=filter_stopwords)

    # Get keyword weights
    keywords = jieba.analyse.extract_tags(text, topK=top_k, withWeight=True)
    weight_map: dict[str, float] = {kw: w for kw, w in keywords}

    # Attach weights
    for entry in words:
        entry["weight"] = round(weight_map.get(entry["word"], 0.0), 4)

    return words


def add_word(word: str, freq: int = None, tag: str = "x") -> None:
    """Dynamically add a word to the jieba dictionary."""
    if freq:
        jieba.add_word(word, freq=freq, tag=tag)
    else:
        jieba.add_word(word, tag=tag)


def suggest_freq(segment: str) -> float:
    """Suggest the frequency of a segment, useful for tuning."""
    return jieba.suggest_freq(segment, tune=True)
