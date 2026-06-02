import sys, requests, gzip, json, os, time
sys.stdout.reconfigure(encoding='utf-8')

DATA_URL = "https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/goodreads_books.json.gz"
LOCAL_GZ = "goodreads_books.json.gz"
OUTPUT_FILE = "seed_books.json"
TARGET_COUNT = 15000
MIN_DESC_LENGTH = 100

SHELF_TO_CATEGORY = {
    "computers": 1, "programming": 1, "computer": 1, "technology": 1,
    "software": 1, "coding": 1, "tech": 1, "machine-learning": 1, "data-science": 1,
    "science": 2, "biology": 2, "chemistry": 2, "psychology": 2, "nature": 2,
    "mathematics": 3, "math": 3, "algebra": 3, "geometry": 3, "statistics": 3,
    "physics": 4,
    "fiction": 5, "fantasy": 5, "science-fiction": 5, "mystery": 5,
    "romance": 5, "thriller": 5, "horror": 5, "classics": 5, "poetry": 5,
    "novels": 5, "literature": 5, "adventure": 5, "drama": 5, "comics": 5,
    "children": 5, "young-adult": 5, "crime": 5, "paranormal": 5, "humor": 5,
    "economics": 6, "business": 6, "finance": 6, "management": 6,
    "entrepreneurship": 6, "marketing": 6, "investing": 6,
    "language": 7, "linguistics": 7,
    "history": 8, "historical": 8, "biography": 8, "memoir": 8, "politics": 8,
}

FALLBACK_CATEGORIES = [1, 2, 3, 4, 5, 6, 7, 8]

def normalize_key(value):
    return " ".join((value or "").strip().lower().split())

def download_file(url, local_path, max_retries=10):
    for attempt in range(max_retries):
        headers = {}
        mode = 'wb'
        if os.path.exists(local_path):
            existing = os.path.getsize(local_path)
            headers['Range'] = f'bytes={existing}-'
            mode = 'ab'
            print(f"Partial file found ({existing/1024**2:.1f} MB), resuming (attempt {attempt+1})...")

        resp = requests.get(url, stream=True, timeout=(30, 60), headers=headers)
        if resp.status_code == 416:
            print("File already fully downloaded.")
            return
        resp.raise_for_status()

        downloaded = os.path.getsize(local_path) if os.path.exists(local_path) else 0
        start = time.time()
        last_log = start
        ok = True

        with open(local_path, mode) as f:
            try:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        now = time.time()
                        if now - last_log >= 5:
                            speed = downloaded / (now - start) / 1024 / 1024
                            print(f"Downloaded {downloaded/1024**2:.1f} MB ({speed:.1f} MB/s)")
                            last_log = now
            except requests.exceptions.ConnectionError:
                print(f"Connection lost at {downloaded/1024**2:.1f} MB, retrying...")
                ok = False

        if ok:
            elapsed = time.time() - start
            speed = downloaded / elapsed / 1024 / 1024
            print(f"Download complete: {downloaded/1024**2:.1f} MB in {elapsed:.1f}s ({speed:.1f} MB/s)")
            return

    raise RuntimeError(f"Failed after {max_retries} retries")

def map_category(shelves):
    best = None
    for shelf in shelves:
        name = shelf.get('name', '').lower().strip()
        cat = SHELF_TO_CATEGORY.get(name)
        if cat is not None:
            count = int(shelf.get('count', 0))
            if best is None or count > best[1]:
                best = (cat, count)
    return best[0] if best else None

def load_authors(authors_gz_path):
    print(f"Loading authors map from {authors_gz_path}...")
    authors_map = {}
    if not os.path.exists(authors_gz_path):
        print(f"Warning: {authors_gz_path} not found. Authors mapping will be skipped.")
        return authors_map
    
    start = time.time()
    with gzip.open(authors_gz_path, 'rt', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                aid = data.get('author_id')
                name = data.get('name')
                if aid and name:
                    authors_map[aid] = name.strip()
            except Exception:
                continue
    elapsed = time.time() - start
    print(f"Loaded {len(authors_map)} authors in {elapsed:.1f}s.")
    return authors_map

def process_file(local_path, authors_map):
    print(f"Processing {local_path}...")
    books = []
    seen_isbns = set()
    seen_seed_keys = set()
    fallback_idx = 0
    start = time.time()

    with gzip.open(local_path, 'rt', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue

            desc = data.get('description', '')
            if not desc or len(desc) < MIN_DESC_LENGTH:
                continue

            img_url = data.get('image_url', '')
            if not img_url or img_url.startswith('https://s.gr-assets.com/assets/nophoto/'):
                continue

            title = data.get('title', '')
            if not title:
                continue

            isbn = data.get('isbn', '').strip()
            if isbn and isbn in seen_isbns:
                continue
            if isbn:
                seen_isbns.add(isbn)

            authors = data.get('authors', [])
            author_names = []
            for a in authors:
                aid = a.get('author_id', '')
                if aid and aid in authors_map:
                    author_names.append(authors_map[aid])
                else:
                    name = a.get('name', '').strip()
                    if name:
                        author_names.append(name)
                    elif aid:
                        author_names.append(f"Author #{aid}")
            if not author_names:
                continue

            if not isbn:
                seed_key = (
                    normalize_key(title),
                    tuple(sorted(normalize_key(author) for author in author_names))
                )
                if seed_key in seen_seed_keys:
                    continue
                seen_seed_keys.add(seed_key)

            pub_year = data.get('publication_year', '')
            if pub_year and isinstance(pub_year, str) and pub_year.isdigit():
                pub_year = int(pub_year)

            # Phân tích popular_shelves để lấy ra 2 thể loại (categories) chính xác nhất
            ignore_shelves = {'to-read', 'currently-reading', 'favorites', 'owned', 'books-i-own', 'library', 'audiobook', 'kindle', 'default', 'ebook', 'my-books', 'read-in-2015', 'read-in-2016', 'to-buy', 'did-not-finish'}
            shelves = data.get('popular_shelves', [])
            categories = []
            for shelf in shelves:
                name = shelf.get('name', '').lower()
                if name and name not in ignore_shelves and not name.isnumeric():
                    # Chuẩn hóa tên thể loại, vd: "science-fiction" -> "Science Fiction"
                    cat_name = " ".join([word.capitalize() for word in name.split('-')])
                    categories.append(cat_name)
                    if len(categories) >= 2: # Chỉ lấy tối đa 2 thể loại chất lượng nhất
                        break
            
            if not categories:
                categories = ["Uncategorized"] # Rất hiếm khi xảy ra vì sách Goodreads luôn có shelves

            book = {
                "title": title.strip(),
                "author": ", ".join(author_names),
                "description": desc.strip(),
                "coverImageUrl": img_url,
                "isbn": data.get('isbn', ''),
                "publishYear": pub_year,
                "publisher": data.get('publisher', ''),
                "categories": categories
            }
            books.append(book)

            if len(books) % 500 == 0:
                print(f"Collected {len(books)} / {TARGET_COUNT} books...")

            if len(books) >= TARGET_COUNT:
                print("Target reached.")
                break

    elapsed = time.time() - start
    print(f"Processed {len(books)} books in {elapsed:.1f}s")

    # Stats per category
    from collections import Counter
    stats = Counter()
    for b in books:
        for cat in b.get("categories", []):
            stats[cat] += 1
    print("Category distribution:", dict(sorted(stats.items(), key=lambda x: -x[1])[:15]))

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        json.dump(books, out, indent=2, ensure_ascii=False)

    size_mb = os.path.getsize(OUTPUT_FILE) / 1024 / 1024
    print(f"Saved to {OUTPUT_FILE} ({size_mb:.2f} MB)")

def extract_books():
    download_file(DATA_URL, LOCAL_GZ)
    authors_gz = "goodreads_book_authors.json.gz"
    authors_map = load_authors(authors_gz)
    process_file(LOCAL_GZ, authors_map)

if __name__ == "__main__":
    extract_books()
