# Demo Data Seeding

This script creates a small set of demo accounts and active holds through the public REST API. It is intended for local demos, VPS demos, and defense rehearsals.

Use this script instead of Flyway for demo users and holds because these records are business state, not schema/reference data. Creating holds through the API keeps password hashing, copy reservation, notifications, audit logging, and validation consistent with the application.

The script uses only the Python standard library, so no extra package installation is required.

## What It Creates

- 2 librarians:
  - `librarian_demo_01`
  - `librarian_demo_02`
- 5 students:
  - `student_demo_01` to `student_demo_05`
  - student IDs `DEMO2026001` to `DEMO2026005`
- 2 active holds per demo student when enough available books exist.

Default demo password:

```text
Demo@123456
```

## Run Locally

Start the Docker stack first, then run:

```powershell
python scripts/seed_demo_users_and_holds.py --api-base http://localhost:8080/api
```

## Run Against VPS

Use the public API URL:

```powershell
$env:ADMIN_PASSWORD="your-production-admin-password"
python scripts/seed_demo_users_and_holds.py --api-base https://your-domain.com/api
```

You can also pass admin credentials explicitly:

```powershell
python scripts/seed_demo_users_and_holds.py --api-base https://your-domain.com/api --admin-username admin --admin-password "your-production-admin-password"
```

## Dry Run

Preview actions without writing data:

```powershell
python scripts/seed_demo_users_and_holds.py --api-base http://localhost:8080/api --dry-run
```

## Idempotency

The script is safe to run more than once:

- Existing demo users are skipped by username or student ID.
- Students with at least the target number of `ACTIVE` holds are skipped.
- If a selected book cannot be held, the script tries the next available book.

The default target is 2 active holds per demo student. Override it when needed:

```powershell
python scripts/seed_demo_users_and_holds.py --api-base http://localhost:8080/api --holds-per-student 1
```

If an existing demo account has a different password, the script cannot login as that student and will skip hold creation for that account.
