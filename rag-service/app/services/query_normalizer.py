import re
import unicodedata
from dataclasses import dataclass


QUESTION_FRAME_PATTERNS = (
    r"\bco\s+(?:cuon\s+)?sach\s+nao\b",
    r"\btim\s+(?:giup\s+)?(?:toi\s+)?(?:cuon\s+)?sach\b",
    r"\bgoi\s+y\s+(?:giup\s+)?(?:toi\s+)?(?:cuon\s+)?sach\b",
    r"\bsach\s+nao\b",
    r"\bcuon\s+nao\b",
    r"\bquyen\s+nao\b",
    r"\btrong\s+thu\s+vien\b",
    r"\bthu\s+vien\s+co\b",
    r"\bkhong\b",
)

RELATION_FRAME_PATTERNS = (
    r"\bco\s+noi\s+dung\s+(?:ve|lien\s+quan\s+(?:toi|den|ve))\b",
    r"\bnoi\s+dung\s+(?:ve|lien\s+quan\s+(?:toi|den|ve))\b",
    r"\bco\s+chu\s+de\s+(?:ve|lien\s+quan\s+(?:toi|den|ve))\b",
    r"\bchu\s+de\s+(?:ve|lien\s+quan\s+(?:toi|den|ve))\b",
    r"\blien\s+quan\s+(?:toi|den|ve)\b",
    r"\bnoi\s+ve\b",
    r"\bve\b",
)

LEADING_FILLER_PATTERNS = (
    r"^(?:toi\s+)?(?:muon\s+)?",
    r"^(?:hay\s+)?(?:cho\s+toi\s+)?",
)


@dataclass(frozen=True)
class NormalizedBookQuery:
    original: str
    normalized: str

    @property
    def changed(self) -> bool:
        return self.normalized != self.original


def normalize_search_text(value: str) -> str:
    ascii_text = (value or "").replace("đ", "d").replace("Đ", "D")
    ascii_text = unicodedata.normalize("NFKD", ascii_text)
    ascii_text = "".join(char for char in ascii_text if not unicodedata.combining(char))
    normalized = re.sub(r"[^a-zA-Z0-9]+", " ", ascii_text.lower())
    return re.sub(r"\s+", " ", normalized).strip()


def normalize_book_search_query(question: str) -> NormalizedBookQuery:
    original = normalize_search_text(question)
    if not original:
        return NormalizedBookQuery(original=original, normalized=original)

    normalized = f" {original} "
    for pattern in LEADING_FILLER_PATTERNS + QUESTION_FRAME_PATTERNS + RELATION_FRAME_PATTERNS:
        normalized = re.sub(pattern, " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized)

    normalized = normalized.strip()
    return NormalizedBookQuery(
        original=original,
        normalized=normalized or original,
    )
