import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.query_normalizer import normalize_book_search_query


def test_normalize_book_search_query_removes_question_frames():
    q1 = normalize_book_search_query("có sách nào liên quan tới lego chima không?")
    assert q1.normalized == "lego chima"
    assert q1.lexical == "lego chima"

    q2 = normalize_book_search_query("có sách nào chủ đề về lego chima không?")
    assert q2.normalized == "lego chima"
    assert q2.lexical == "lego chima"

    q3 = normalize_book_search_query("có sách nào có nội dung về hành trình trở lại tuổi thơ để đi tìm sự thật không?")
    assert q3.normalized == "hành trình trở lại tuổi thơ để đi tìm sự thật"
    assert q3.lexical == "hanh trinh tro lai tuoi tho de di tim su that"


def test_normalize_book_search_query_keeps_direct_keyword_queries():
    q1 = normalize_book_search_query("Tracey West")
    assert q1.normalized == "Tracey West"
    assert q1.lexical == "tracey west"

    q2 = normalize_book_search_query("lego chima")
    assert q2.normalized == "lego chima"
    assert q2.lexical == "lego chima"


def test_normalize_book_search_query_removes_leading_user_pronoun():
    q = normalize_book_search_query("bạn có sách nào về lego chima không?")
    assert q.normalized == "lego chima"
    assert q.lexical == "lego chima"


def test_normalize_book_search_query_removes_bare_content_frame():
    q = normalize_book_search_query("tìm sách có nội dung người ngoài hành tinh xâm chiếm trái đất")
    assert q.normalized == "người ngoài hành tinh xâm chiếm trái đất"
    assert q.lexical == "nguoi ngoai hanh tinh xam chiem trai dat"
