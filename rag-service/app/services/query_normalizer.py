import re
import unicodedata
from dataclasses import dataclass


QUESTION_FRAME_PATTERNS = (
    # Accented
    r"\bcó\s+(?:cuốn\s+)?sách\s+nào\b",
    r"\btìm\s+(?:giúp\s+)?(?:tôi\s+)?(?:cuốn\s+)?sách\b",
    r"\bgợi\s+ý\s+(?:giúp\s+)?(?:tôi\s+)?(?:cuốn\s+)?sách\b",
    r"\bsách\s+nào\b",
    r"\bcuốn\s+nào\b",
    r"\bquyển\s+nào\b",
    r"\btrong\s+thư\s+viện\b",
    r"\bthư\s+viện\s+có\b",
    r"\bkhông\s*[?.,!]*\s*$",
    # Unaccented
    r"\bco\s+(?:cuon\s+)?sach\s+nao\b",
    r"\btim\s+(?:giup\s+)?(?:toi\s+)?(?:cuon\s+)?sach\b",
    r"\bgoi\s+y\s+(?:giup\s+)?(?:toi\s+)?(?:cuon\s+)?sach\b",
    r"\bsach\s+nao\b",
    r"\bcuon\s+nao\b",
    r"\bquyen\s+nao\b",
    r"\btrong\s+thu\s+vien\b",
    r"\bthu\s+vien\s+co\b",
    r"\bkhong\s*[?.,!]*\s*$",
)

RELATION_FRAME_PATTERNS = (
    # Accented
    r"\bcó\s+nội\s+dung\b",
    r"\bcó\s+nội\s+dung\s+(?:về|liên\s+quan\s+(?:tới|đến|về))\b",
    r"\bnội\s+dung\s+(?:về|liên\s+quan\s+(?:tới|đến|về))\b",
    r"\bcó\s+chủ\s+đề\s+(?:về|liên\s+quan\s+(?:tới|đến|về))\b",
    r"\bchủ\s+đề\s+(?:về|liên\s+quan\s+(?:tới|đến|về))\b",
    r"\bliên\s+quan\s+(?:tới|đến|về)\b",
    r"\bnói\s+về\b",
    r"\bvề\b",
    # Unaccented
    r"\bco\s+noi\s+dung\b",
    r"\bco\s+noi\s+dung\s+(?:ve|lien\s+quan\s+(?:toi|den|ve))\b",
    r"\bnoi\s+dung\s+(?:ve|lien\s+quan\s+(?:toi|den|ve))\b",
    r"\bco\s+chu\s+de\s+(?:ve|lien\s+quan\s+(?:toi|den|ve))\b",
    r"\bchu\s+de\s+(?:ve|lien\s+quan\s+(?:toi|den|ve))\b",
    r"\blien\s+quan\s+(?:toi|den|ve)\b",
    r"\bnoi\s+ve\b",
    r"\bve\b",
)

LEADING_FILLER_PATTERNS = (
    # Accented
    r"^\s*bạn\s+",
    r"^\s*(?:tôi\s+)?(?:muốn\s+)?",
    r"^\s*(?:hãy\s+)?(?:cho\s+tôi\s+)?",
    # Unaccented
    r"^\s*ban\s+",
    r"^\s*(?:toi\s+)?(?:muon\s+)?",
    r"^\s*(?:hay\s+)?(?:cho\s+toi\s+)?",
)


@dataclass(frozen=True)
class NormalizedBookQuery:
    original: str
    normalized: str
    lexical: str

    @property
    def changed(self) -> bool:
        return self.normalized != self.original


def normalize_search_text(value: str) -> str:
    ascii_text = (value or "").replace("đ", "d").replace("Đ", "D")
    ascii_text = unicodedata.normalize("NFKD", ascii_text)
    ascii_text = "".join(char for char in ascii_text if not unicodedata.combining(char))
    normalized = re.sub(r"[^a-zA-Z0-9]+", " ", ascii_text.lower())
    return re.sub(r"\s+", " ", normalized).strip()


def normalize_semantic_query(question: str) -> str:
    cleaned = (question or "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    
    normalized = f" {cleaned} "
    for pattern in LEADING_FILLER_PATTERNS + QUESTION_FRAME_PATTERNS + RELATION_FRAME_PATTERNS:
        normalized = re.sub(pattern, " ", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\s+", " ", normalized)

    result = normalized.strip()
    # Strip trailing punctuation from the end of the query string
    result = re.sub(r"[?.,!;:\s]+$", "", result)
    return result or cleaned


def normalize_book_search_query(question: str) -> NormalizedBookQuery:
    if not question:
        return NormalizedBookQuery(original="", normalized="", lexical="")
        
    normalized = normalize_semantic_query(question)
    lexical = normalize_search_text(normalized)
    
    return NormalizedBookQuery(
        original=question,
        normalized=normalized,
        lexical=lexical,
    )
