import requests, json, os, sys, time

API_BASE = "http://127.0.0.1:8080/api"
BOOKS_FILE = os.path.join(os.path.dirname(__file__), "seed_books.json")
BATCH_SIZE = 200

def login(retries=5, delay=5):
    for attempt in range(retries):
        try:
            r = requests.post(f"{API_BASE}/auth/login", json={
                "username": "admin",
                "password": "Admin@123"
            }, timeout=30)
            r.raise_for_status()
            token = r.json()["data"]["accessToken"]
            return {"Authorization": f"Bearer {token}"}
        except requests.exceptions.RequestException:
            if attempt < retries - 1:
                print(f"Backend not ready, retrying in {delay}s (attempt {attempt+2}/{retries})...")
                time.sleep(delay)
            else:
                raise

def import_books(headers):
    with open(BOOKS_FILE, "r", encoding="utf-8") as f:
        books = json.load(f)

    total = len(books)
    imported = 0
    skipped = 0
    new_cats = 0

    print(f"Importing {total} books in batches of {BATCH_SIZE}...")
    for start in range(0, total, BATCH_SIZE):
        batch = books[start:start + BATCH_SIZE]
        r = requests.post(f"{API_BASE}/admin/seed", json={"books": batch}, headers=headers, timeout=120)
        r.raise_for_status()
        result = r.json()["data"]
        imported += result["imported"]
        skipped += result["skipped"]
        new_cats = result["totalCategories"]
        print(f"  Batch {start//BATCH_SIZE + 1}/{(total+BATCH_SIZE-1)//BATCH_SIZE}: +{result['imported']} ok, {result['skipped']} skip")

    print(f"Done! Imported: {imported}, Skipped: {skipped}, New categories: {new_cats}")

if __name__ == "__main__":
    headers = login()
    import_books(headers)
