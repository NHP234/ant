# Issues & Questions

> Ghi lại bugs, blockers, câu hỏi chưa trả lời, và các vấn đề cần giải quyết.

## Format

```
### [ISSUE-XXX] Tiêu đề
- **Loại**: Bug / Question / Blocker / Enhancement
- **Trạng thái**: Open / In Progress / Resolved
- **Ngày tạo**: YYYY-MM-DD
- **Mô tả**: ...
- **Giải pháp**: ... (khi resolved)
```

---

## Open Issues

_(Chưa có issue nào)_

---

## Resolved Issues

_(Chưa có)_

---

## Pending Questions

### [Q-001] Chọn UI Component Library: Ant Design hay MUI?
- **Ngày**: 2026-03-04
- **Context**: Cả hai đều phù hợp. Ant Design có nhiều component cho admin panel (Table, Form). MUI có design đẹp hơn.
- **Kết luận**: Chưa quyết định. Sẽ quyết khi bắt đầu frontend (tháng 2-3).

### [Q-002] LLM cho RAG: OpenAI API hay Ollama local?
- **Ngày**: 2026-03-04
- **Context**: OpenAI dễ dùng nhưng tốn tiền. Ollama free nhưng cần máy mạnh (RAM >= 16GB cho Llama 3 8B).
- **Kết luận**: Develop với OpenAI (nhanh debug), demo với Ollama nếu máy đủ mạnh. Fallback: dùng OpenAI free tier / API key từ thầy.
