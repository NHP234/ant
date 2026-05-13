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

### [Q-001] Chọn UI Component Library: Ant Design hay MUI?
- **Ngày**: 2026-03-04
- **Resolved**: 2026-05-08
- **Context**: Cả hai đều phù hợp. Ant Design có nhiều component cho admin panel (Table, Form). MUI có design đẹp hơn.
- **Kết luận**: Chọn **Shadcn/ui** (Radix + Nova preset) + TailwindCSS v4 — headless components, dễ customize, hiện đại hơn cả hai lựa chọn ban đầu.

---

## Pending Questions



### [Q-002] LLM cho RAG: OpenAI API hay Ollama local?
- **Ngày**: 2026-03-04
- **Context**: OpenAI dễ dùng nhưng tốn tiền. Ollama free nhưng cần máy mạnh (RAM >= 16GB cho Llama 3 8B).
- **Kết luận**: Develop với OpenAI (nhanh debug), demo với Ollama nếu máy đủ mạnh. Fallback: dùng OpenAI free tier / API key từ thầy.
