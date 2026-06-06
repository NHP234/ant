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
- Typography: clean sans-serif (Inter) for everything. Headings differentiated by weight and size, not by font family.
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

---

## UI Consistency Rules (MANDATORY)

These rules must be followed in every file. Violations are not acceptable.

### 1. Typography — Single Font Family
- **DO**: Use Inter (`font-sans`) for ALL text — headings, body, labels, buttons.
- **DO NOT**: Mix serif fonts (Playfair Display, Georgia) with sans-serif. The `font-heading` token must NOT appear in any component.
- **Headings**: Differentiate by `font-bold` / `font-semibold` + size (`text-2xl`, `text-3xl`), never by font family.
- **Page title standard**: `text-2xl font-bold tracking-tight` — same for all pages, student and admin.

### 2. No Emoji — Ever
- **DO NOT** use emoji characters (🐜📚👥⚠️🔍📅📌❌✅🏷️ etc.) anywhere in the UI — not in text, stat cards, welcome messages, error messages, or labels.
- **DO**: Use `lucide-react` icons for all visual indicators. Example: `<BookOpen />` instead of `📚`, `<Users />` instead of `👥`.
- Numbers styled with icon prefixes use `<IconName className="h-4 w-4" />` inline.

### 3. Colors — Use Tokens, Not Hardcoded
- **DO**: Use CSS variable-based classes: `bg-primary`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `text-destructive`.
- **ACCEPTABLE**: Use `stone-100`/`stone-900` ONLY as a neutral complement within contained, self-styled sub-components (e.g., hero banner dark section). Do not scatter them randomly.
- **DO NOT**: Use hardcoded Tailwind colors (`bg-emerald-600`, `text-red-600`, `bg-amber-500`, `bg-indigo-600`) for semantic meanings. Instead, define custom tokens in `index.css` if needed (e.g., `--color-success`, `--color-warning`).
- **Exception**: Progress bars and status badges may use direct Tailwind colors for status semantics (green=good, red=overdue, amber=warning) but should be consolidated into a shared utility or component (e.g., StatusBadge).

### 4. Page Headers — Use PageHeader Component
- Every page must use the shared `<PageHeader>` component for its title section.
- Props: `title` (string), `description` (string, optional), `actions` (ReactNode slot, optional).
- Standardized: `text-2xl font-bold tracking-tight` title + `text-sm text-muted-foreground` description.
- No ad-hoc `<div><h2>...</h2><p>...</p></div>` scattered across pages.

### 5. Empty States
- All list/table pages must have a styled empty state with:
  - A centered lucide-react icon (48×48, `text-muted-foreground/40`).
  - A short guidance sentence below.
  - Optional action button (e.g., "Duyệt sách" on empty borrows list).
- Do not use plain text like `"Không có dữ liệu"` alone.

### 6. Dark Mode Compatibility
- All custom colors must work in both light and dark modes.
- Use `dark:` variants explicitly when using non-token colors.
- Test: toggle dark mode and verify no text becomes invisible or unreadable.

### 7. Animation
- Page-level: `animate-in fade-in duration-500` on route change (handled by Layout).
- Content-level: `animate-in fade-in slide-in-from-bottom-4 duration-500` for list items appearing.
- Do NOT use `animate-bounce`, `animate-spin` (except loading spinners), or attention-seeking animations.

### 8. Spacing & Layout
- Page padding: handled by layout (`p-4 md:p-8`). Pages should not add their own outer padding.
- Section spacing within pages: `space-y-6` (standard), `space-y-8` (for major sections).
- Card internal padding: `p-4` (compact) or `p-6` (spacious). Be consistent within a page.
