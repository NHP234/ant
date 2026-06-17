import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.chat_orchestrator import build_contextual_question


def test_no_reference_term_does_not_match_inside_noi():
    history = ['Bot: - Sách: *truyện thiếu nhi*']
    question = "sách về lego nói chung thì sao, thư viện có không?"

    assert build_contextual_question(question, history) == question


def test_standalone_no_reference_still_uses_context():
    history = ['Bot: - Sách: *LEGO Legends of Chima: Origins: A Starter Handbook*']

    assert build_contextual_question("nó nói về gì?", history) == (
        'Đang hỏi về sách "LEGO Legends of Chima: Origins: A Starter Handbook". '
        "nó nói về gì?"
    )
