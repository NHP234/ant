# Deployment Guide - DigitalOcean VPS

This guide deploys Awaken Ant Library to one DigitalOcean Droplet with Docker Compose, Caddy HTTPS, PostgreSQL, Redis, backend, frontend, RAG service and ChromaDB.

## 1. Infrastructure

Recommended Droplet:

- Ubuntu LTS
- Basic or Premium AMD/Intel
- At least 2 vCPU / 4 GB RAM
- Disk large enough for Docker images, PostgreSQL dump and Chroma data

The normal DigitalOcean Basic/Premium Droplet is CPU-only. The RAG service can still run BGE-M3 on CPU; GPU configuration is only relevant if you explicitly provision a DigitalOcean GPU Droplet or another host with NVIDIA GPU support.

Firewall:

- Inbound: SSH `22`, HTTP `80`, HTTPS `443`
- Do not expose `8080`, `5432`, `6379` or `8000`

Domain:

- Buy or claim a domain from a registrar outside DigitalOcean.
- Create an `A` record pointing the domain to the Droplet public IP.
- DigitalOcean DNS can manage the zone, but DigitalOcean is not the domain registrar.

## 2. Server Setup

Install Docker on the Droplet:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in, then clone the repository:

```bash
git clone <your-repo-url> awaken-ant
cd awaken-ant
cp .env.production.example .env.production
nano .env.production
```

Set real values for:

- `APP_DOMAIN`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `INTERNAL_API_KEY`
- `NFC_API_KEY`
- `ADMIN_PASSWORD`
- `DEEPSEEK_API_KEY`

Validate Compose config:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

## 3. Local Backup

Run these from the project root on the local machine while the local Docker stack is running.

Create backup folder:

```powershell
New-Item -ItemType Directory -Force deploy-backups
```

Dump PostgreSQL:

```powershell
docker exec library-postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/library.pgdump'
docker cp library-postgres:/tmp/library.pgdump .\deploy-backups\library.pgdump
docker exec library-postgres rm /tmp/library.pgdump
```

Archive ChromaDB volume:

```powershell
docker run --rm -v ant_rag_data:/data -v ${PWD}\deploy-backups:/backup alpine sh -lc "tar -czf /backup/chroma.tar.gz -C /data ."
```

If the embedding model has changed, do not reuse an old Chroma archive produced by the previous model. Restore PostgreSQL first, start the stack, then run a full RAG ingest so ChromaDB is rebuilt with vectors from the current embedding model.

Copy backups to VPS:

```powershell
scp .\deploy-backups\library.pgdump root@YOUR_DROPLET_IP:/root/awaken-ant/
scp .\deploy-backups\chroma.tar.gz root@YOUR_DROPLET_IP:/root/awaken-ant/
```

## 4. Restore On VPS

Start only PostgreSQL first:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
```

Restore PostgreSQL:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml cp ./library.pgdump postgres:/tmp/library.pgdump
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner /tmp/library.pgdump'
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres rm /tmp/library.pgdump
```

Restore ChromaDB:

```bash
docker volume create awaken-ant-rag-data
docker run --rm -v awaken-ant-rag-data:/data -v "$PWD":/backup alpine sh -lc "rm -rf /data/* && tar -xzf /backup/chroma.tar.gz -C /data"
```

Skip this restore step when changing embedding models. In that case, let the RAG service create a fresh Chroma directory and trigger full ingestion after the database restore.

Start the full stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 5. Verification

Check containers:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 rag-service
```

Check HTTP/HTTPS:

```bash
curl -I https://YOUR_DOMAIN
curl -I "https://YOUR_DOMAIN/api/books?page=0&size=1"
```

Check DB counts:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) as books from books; select count(*) as copies from book_copies; select count(*) as users from users; select count(*) as slips from borrow_slips; select count(*) as holds from book_holds;"'
```

Manual smoke test:

- Login as admin and student.
- Browse books and verify cover images.
- Ask chatbot for a known book and current borrow/hold status.
- Student places a hold.
- Librarian/admin picks up held books and creates one borrow slip.
- Return a borrowed copy.

## 6. NFC After Web Deploy

The deployment does not require ESP32 to call the VPS on day one.

After HTTPS is stable, update firmware:

- `API_URL = "https://YOUR_DOMAIN/api/nfc/scan"`
- Use `WiFiClientSecure` with `setInsecure()` for demo speed, or configure a root CA for stricter TLS.
- Keep the local/web fallback ready for defense day.

## 7. Rollback

Keep local backup files until defense is complete:

- `deploy-backups/library.pgdump`
- `deploy-backups/chroma.tar.gz`

Rollback on VPS:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down
docker volume rm awaken-ant-postgres-data awaken-ant-rag-data
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
# restore PostgreSQL and Chroma again from the known-good backup
```
