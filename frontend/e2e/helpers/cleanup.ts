import { spawnSync } from 'node:child_process'

const postgresContainer = process.env.E2E_POSTGRES_CONTAINER ?? 'library-postgres'
const ragContainer = process.env.E2E_RAG_CONTAINER ?? 'library-rag-service'
const postgresUser = process.env.E2E_POSTGRES_USER ?? 'library_user'
const postgresDb = process.env.E2E_POSTGRES_DB ?? 'library_db'

const testBookWhere = `
  title LIKE 'E2E %'
  OR title LIKE 'E2E_%'
  OR title LIKE 'Role Navigation Book%'
  OR title LIKE 'Counter Borrow Book%'
  OR title LIKE 'Duplicate Counter Book%'
  OR title LIKE 'Playwright Book%'
  OR title LIKE 'NFC Assignment Test Book%'
  OR title LIKE 'Batch Borrow First Book%'
  OR title LIKE 'Batch Borrow Second Book%'
  OR title LIKE 'Kiosk First Book%'
  OR title LIKE 'Kiosk Second Book%'
  OR title = 'E2E Test Book'
`

function runDocker(args: string[], input?: string, failOnError = true) {
  const result = spawnSync('docker', args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  if (result.status !== 0 && failOnError) {
    throw new Error([
      `docker ${args.join(' ')} failed`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'))
  }

  return result
}

function psql(sql: string, args: string[] = []) {
  return runDocker([
    'exec',
    '-i',
    postgresContainer,
    'psql',
    '-U',
    postgresUser,
    '-d',
    postgresDb,
    '-v',
    'ON_ERROR_STOP=1',
    ...args,
  ], sql)
}

function queryTestBookIds() {
  const result = psql(
    `SELECT id FROM books WHERE ${testBookWhere} ORDER BY id;`,
    ['-t', '-A'],
  )

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function deleteRagVectors(bookIds: string[]) {
  if (bookIds.length === 0) {
    return
  }

  const script = `
import os
import urllib.request

book_ids = ${JSON.stringify(bookIds)}
key = os.environ.get("INTERNAL_API_KEY", "")

if not key:
    raise RuntimeError("INTERNAL_API_KEY is not configured in the RAG container")

for book_id in book_ids:
    request = urllib.request.Request(
        f"http://127.0.0.1:8000/api/ingest/books/{book_id}",
        method="DELETE",
        headers={"X-Internal-Key": key},
    )
    with urllib.request.urlopen(request, timeout=20):
        pass
`

  const result = runDocker([
    'exec',
    '-i',
    ragContainer,
    'python',
    '-',
  ], script, false)

  if (result.status !== 0) {
    console.warn('E2E cleanup could not delete RAG vectors. DB cleanup will still continue.')
    console.warn(result.stderr || result.stdout)
  }
}

export async function cleanupE2eData() {
  if (process.env.E2E_SKIP_DB_CLEANUP === 'true') {
    return
  }

  const bookIds = queryTestBookIds()
  deleteRagVectors(bookIds)

  psql(`
BEGIN;

CREATE TEMP TABLE e2e_test_users ON COMMIT DROP AS
SELECT id FROM users
WHERE username LIKE 'e2e_%'
   OR username LIKE 'role_librarian_%'
   OR username LIKE 'role_student_%'
   OR username LIKE 'counter_student_%'
   OR username LIKE 'counter_duplicate_%';

CREATE TEMP TABLE e2e_test_books ON COMMIT DROP AS
SELECT id FROM books
WHERE ${testBookWhere};

CREATE TEMP TABLE e2e_test_categories ON COMMIT DROP AS
SELECT id FROM categories
WHERE name LIKE 'E2E %'
   OR name LIKE 'E2E_%';

CREATE TEMP TABLE e2e_test_copies ON COMMIT DROP AS
SELECT id FROM book_copies WHERE book_id IN (SELECT id FROM e2e_test_books);

CREATE TEMP TABLE e2e_user_hold_copies ON COMMIT DROP AS
SELECT copy_id AS id FROM book_holds
WHERE user_id IN (SELECT id FROM e2e_test_users)
   OR librarian_id IN (SELECT id FROM e2e_test_users);

CREATE TEMP TABLE e2e_test_slips ON COMMIT DROP AS
SELECT DISTINCT br.slip_id AS id FROM borrow_records br WHERE br.copy_id IN (SELECT id FROM e2e_test_copies)
UNION
SELECT id FROM borrow_slips WHERE user_id IN (SELECT id FROM e2e_test_users) OR librarian_id IN (SELECT id FROM e2e_test_users);

CREATE TEMP TABLE e2e_affected_copies ON COMMIT DROP AS
SELECT id FROM e2e_test_copies
UNION
SELECT id FROM e2e_user_hold_copies
UNION
SELECT br.copy_id AS id FROM borrow_records br WHERE br.slip_id IN (SELECT id FROM e2e_test_slips);

DELETE FROM notifications
WHERE user_id IN (SELECT id FROM e2e_test_users)
   OR title LIKE 'E2E %'
   OR title LIKE 'E2E_%'
   OR message LIKE '%E2E %'
   OR message LIKE '%E2E_%';

DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM e2e_test_users);

DELETE FROM book_holds
WHERE copy_id IN (SELECT id FROM e2e_affected_copies)
   OR user_id IN (SELECT id FROM e2e_test_users)
   OR librarian_id IN (SELECT id FROM e2e_test_users);

DELETE FROM borrow_records
WHERE copy_id IN (SELECT id FROM e2e_test_copies)
   OR slip_id IN (SELECT id FROM e2e_test_slips);

DELETE FROM borrow_slips
WHERE id IN (SELECT id FROM e2e_test_slips)
   OR user_id IN (SELECT id FROM e2e_test_users)
   OR librarian_id IN (SELECT id FROM e2e_test_users);

UPDATE book_copies
SET status = 'AVAILABLE'
WHERE id IN (SELECT id FROM e2e_affected_copies)
  AND id NOT IN (SELECT id FROM e2e_test_copies);

DELETE FROM book_copies WHERE id IN (SELECT id FROM e2e_test_copies);
DELETE FROM book_categories WHERE book_id IN (SELECT id FROM e2e_test_books) OR category_id IN (SELECT id FROM e2e_test_categories);
DELETE FROM book_authors WHERE book_id IN (SELECT id FROM e2e_test_books);
DELETE FROM books WHERE id IN (SELECT id FROM e2e_test_books);

DELETE FROM authors a
WHERE (a.name LIKE 'E2E %' OR a.name LIKE 'E2E_%' OR a.name IN ('Role Navigation Author', 'Counter Borrow Author', 'Playwright Author', 'E2E Author', 'NFC Test Author', 'First Author', 'Second Author'))
  AND NOT EXISTS (SELECT 1 FROM book_authors ba WHERE ba.author_id = a.id);

DELETE FROM categories WHERE id IN (SELECT id FROM e2e_test_categories);
DELETE FROM users WHERE id IN (SELECT id FROM e2e_test_users);

COMMIT;
`)
}
