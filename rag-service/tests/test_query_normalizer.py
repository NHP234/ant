import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.query_normalizer import normalize_book_search_query


def test_normalize_book_search_query_removes_question_frames():
    assert normalize_book_search_query(
        "có sách nào liên quan tới lego chima không?"
    ).normalized == "lego chima"
    assert normalize_book_search_query(
        "có sách nào chủ đề về lego chima không?"
    ).normalized == "lego chima"
    assert normalize_book_search_query(
        "có sách nào có nội dung về hành trình trở lại tuổi thơ để đi tìm sự thật không?"
    ).normalized == "hanh trinh tro lai tuoi tho de di tim su that"


def test_normalize_book_search_query_keeps_direct_keyword_queries():
    assert normalize_book_search_query("Tracey West").normalized == "tracey west"
    assert normalize_book_search_query("lego chima").normalized == "lego chima"
