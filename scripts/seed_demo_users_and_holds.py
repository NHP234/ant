import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from typing import Any
from urllib import error, parse, request


DEFAULT_PASSWORD = "Demo@123456"
DEFAULT_API_BASE = "http://127.0.0.1:8080/api"

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")


@dataclass(frozen=True)
class DemoUser:
    username: str
    password: str
    email: str
    full_name: str
    role: str
    student_id: str | None = None


LIBRARIANS = [
    DemoUser(
        username="librarian_demo_01",
        password=DEFAULT_PASSWORD,
        email="librarian.demo.01@example.com",
        full_name="Demo Librarian 01",
        role="LIBRARIAN",
    ),
    DemoUser(
        username="librarian_demo_02",
        password=DEFAULT_PASSWORD,
        email="librarian.demo.02@example.com",
        full_name="Demo Librarian 02",
        role="LIBRARIAN",
    ),
]

STUDENTS = [
    DemoUser(
        username=f"student_demo_{index:02d}",
        password=DEFAULT_PASSWORD,
        email=f"student.demo.{index:02d}@example.com",
        full_name=f"Demo Student {index:02d}",
        role="STUDENT",
        student_id=f"DEMO2026{index:03d}",
    )
    for index in range(1, 6)
]


class DemoSeedClient:
    def __init__(self, api_base: str, timeout: int) -> None:
        self.api_base = api_base.rstrip("/")
        self.timeout = timeout

    def request_json(
        self,
        method: str,
        path: str,
        token: str | None = None,
        payload: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.api_base}{path}"
        if params:
            url = f"{url}?{parse.urlencode(params)}"

        body = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"

        req = request.Request(url, data=body, headers=headers, method=method)
        with request.urlopen(req, timeout=self.timeout) as response:
            response_body = response.read().decode("utf-8")
            return json.loads(response_body) if response_body else {}

    def login(self, username: str, password: str, retries: int = 1, delay: int = 3) -> str:
        last_error: Exception | None = None
        for attempt in range(retries):
            try:
                response = self.request_json(
                    "POST",
                    "/auth/login",
                    payload={"username": username, "password": password},
                )
                return response["data"]["accessToken"]
            except (error.URLError, KeyError) as exc:
                last_error = exc
                if attempt < retries - 1:
                    print(f"Backend not ready, retrying login in {delay}s...")
                    time.sleep(delay)
        raise RuntimeError(f"Login failed for {username}: {last_error}")

    def list_users(self, admin_token: str) -> list[dict[str, Any]]:
        users: list[dict[str, Any]] = []
        page = 0
        while True:
            response = self.request_json(
                "GET",
                "/users",
                params={"page": page, "size": 100},
                token=admin_token,
            )
            payload = response["data"]
            users.extend(payload["content"])
            if payload["last"]:
                return users
            page += 1

    def create_user(self, admin_token: str, user: DemoUser) -> None:
        payload = {
            "username": user.username,
            "password": user.password,
            "email": user.email,
            "fullName": user.full_name,
            "role": user.role,
        }
        if user.student_id:
            payload["studentId"] = user.student_id

        self.request_json(
            "POST",
            "/users",
            payload=payload,
            token=admin_token,
        )

    def active_hold_count(self, student_token: str) -> int:
        response = self.request_json(
            "GET",
            "/holds/my",
            params={"statuses": "ACTIVE", "page": 0, "size": 1},
            token=student_token,
        )
        return response["data"]["totalElements"]

    def list_available_books(self) -> list[dict[str, Any]]:
        books: list[dict[str, Any]] = []
        page = 0
        while len(books) < 50:
            response = self.request_json(
                "GET",
                "/books",
                params={"page": page, "size": 20, "sort": "id,desc"},
            )
            payload = response["data"]
            books.extend(
                book for book in payload["content"]
                if (book.get("availableCopies") or 0) > 0
            )
            if payload["last"]:
                break
            page += 1
        return books

    def create_hold(self, student_token: str, book_id: int) -> None:
        self.request_json(
            "POST",
            "/holds",
            payload={"bookId": book_id},
            token=student_token,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed demo librarians, students, and active holds through the public API."
    )
    parser.add_argument(
        "--api-base",
        default=os.getenv("API_BASE", DEFAULT_API_BASE),
        help="API base URL, for example http://localhost:8080/api or https://domain.com/api.",
    )
    parser.add_argument(
        "--admin-username",
        default=os.getenv("ADMIN_USERNAME", "admin"),
        help="Admin username used to create demo accounts.",
    )
    parser.add_argument(
        "--admin-password",
        default=os.getenv("ADMIN_PASSWORD", "Admin@123"),
        help="Admin password. Prefer ADMIN_PASSWORD env for production.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="HTTP request timeout in seconds.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned actions without creating users or holds.",
    )
    parser.add_argument(
        "--holds-per-student",
        type=int,
        default=2,
        help="Target number of ACTIVE holds per demo student.",
    )
    return parser.parse_args()


def ensure_users(
    client: DemoSeedClient,
    admin_token: str,
    users: list[DemoUser],
    dry_run: bool,
) -> None:
    existing_users = client.list_users(admin_token)
    usernames = {user["username"] for user in existing_users}
    student_ids = {
        user.get("studentId")
        for user in existing_users
        if user.get("studentId")
    }

    for user in users:
        if user.username in usernames or (user.student_id and user.student_id in student_ids):
            print(f"skip user: {user.username} already exists")
            continue
        if dry_run:
            print(f"would create user: {user.username} ({user.role})")
            continue
        client.create_user(admin_token, user)
        print(f"created user: {user.username} ({user.role})")


def seed_student_holds(
    client: DemoSeedClient,
    students: list[DemoUser],
    holds_per_student: int,
    dry_run: bool,
) -> None:
    if holds_per_student < 1:
        print("holds-per-student is less than 1; skipped hold seeding")
        return

    available_books = client.list_available_books()
    if not available_books:
        print("no available books found; skipped hold seeding")
        return

    book_index = 0
    for student in students:
        try:
            token = client.login(student.username, student.password)
        except RuntimeError as exc:
            print(f"skip hold: cannot login as {student.username}: {exc}")
            continue

        active_count = client.active_hold_count(token)
        if active_count >= holds_per_student:
            print(
                f"skip hold: {student.username} already has "
                f"{active_count} ACTIVE hold(s)"
            )
            continue

        while active_count < holds_per_student and book_index < len(available_books):
            book = available_books[book_index]
            book_index += 1
            if dry_run:
                print(f"would create hold: {student.username} -> {book['title']} (#{book['id']})")
                active_count += 1
                continue
            try:
                client.create_hold(token, book["id"])
                print(f"created hold: {student.username} -> {book['title']} (#{book['id']})")
                active_count += 1
            except error.HTTPError as exc:
                print(
                    f"hold failed for {student.username} and book #{book['id']} "
                    f"({exc.code}); trying next book"
                )

        if active_count < holds_per_student:
            print(
                f"skip hold: no remaining available book for {student.username}; "
                f"currently has {active_count}/{holds_per_student}"
            )


def main() -> int:
    args = parse_args()
    client = DemoSeedClient(args.api_base, args.timeout)

    try:
        admin_token = client.login(
            args.admin_username,
            args.admin_password,
            retries=5,
            delay=5,
        )
        ensure_users(client, admin_token, LIBRARIANS + STUDENTS, args.dry_run)
        seed_student_holds(client, STUDENTS, args.holds_per_student, args.dry_run)
        print("demo seed finished")
        return 0
    except Exception as error:
        print(f"demo seed failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
