# AI Stitch Brief - Library Editorial UI Refresh

## Project Summary
A university library system with three roles: STUDENT, LIBRARIAN, ADMIN. Students browse books and place holds online. Librarians handle direct borrowing at the counter and confirm holds. The UI should reflect the updated hold/borrow flow after schema refactor.

## Goals
- Make the student hold flow clear and reassuring.
- Make librarian borrow/return actions efficient and low-friction.
- Refresh the visual design with a calm, academic "Library Editorial" tone.
- Keep UI consistent with updated API fields and role permissions.

## Visual Direction (Option A: Library Editorial)
- Tone: warm, scholarly, calm.
- Typography: serif for display/headings + clean sans for body.
- Colors: warm neutrals, parchment-like backgrounds, deep ink text, muted accent.
- Texture: subtle grain or paper-like gradients in backgrounds.
- Motion: gentle page-load fades and staggered list reveals.

## Core Screens (Priority)
### Student
- Book Catalog (browse + search)
- Book Detail (availability + hold action)
- My Borrows (history + status)
- Notifications

### Admin/Librarian
- Borrow Management (return + direct borrow at counter)
- Book Management
- Dashboard

## Updated UX Flows
### Student Hold Flow
1. Student views book availability via `availableCopies`.
2. If available, CTA is "Dat muon" (place hold) not "Muon ngay".
3. Submit hold: `POST /holds { bookId }`.
4. Show hold status (ACTIVE) and expiry countdown (24h) with guidance.

### Librarian Direct Borrow
1. Librarian opens Borrow Management.
2. Uses a "Borrow at counter" form:
   - bookId
   - borrower identifier: username or studentId (only one)
   - optional copyId for NFC
3. Submit: `POST /borrows { bookId, username|studentId, copyId? }`.
4. If borrower has active hold for that book, system auto-fulfills it.

### Return Flow
- Librarian confirms return via `PUT /borrows/{id}/return`.

## API Contract Notes
Use these fields for UI labels and badges:
- Book list/detail:
  - `totalCopies`, `availableCopies` (not quantity/availableQuantity)
- Borrow record status: BORROWING, RETURNED, OVERDUE

Endpoints:
- `POST /holds` (student)
- `PUT /holds/{id}/confirm` (librarian)
- `POST /borrows` (librarian direct borrow)
- `PUT /borrows/{id}/return`
- `GET /borrows/my`, `GET /borrows` (admin/librarian)

## Component/Style Notes
- Keep Shadcn UI components; update styling with a cohesive token set.
- Add editorial-style cards and section headers.
- Tables should feel refined: light borders, subtle zebra, clear status pills.
- Provide empty states with gentle guidance copy.

## Copy Tone
- Calm, helpful, academic.
- Avoid aggressive CTAs. Prefer "Dat muon" / "Xem chi tiet" / "Xac nhan".

## Constraints
- Must remain responsive.
- Keep existing routes and page structure unless explicitly approved.
- Maintain role-based access.
- Use Shadcn UI components only (from `components/ui`); do not add new UI libraries.
- Styling must use Tailwind classes + existing CSS variables/tokens (add tokens in `index.css` only if needed).
- Icons must come from `lucide-react` only.
- Keep AdminLayout/StudentLayout structure and route paths intact.
