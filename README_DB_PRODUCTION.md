# StyleQR – PostgreSQL (Production)

Production uses **PostgreSQL**. The app no longer uses SQLite.

## 1. Install PostgreSQL

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Windows

- [PostgreSQL installer](https://www.postgresql.org/download/windows/)
- Or: `winget install PostgreSQL.PostgreSQL`

### Docker

```bash
docker run -d --name styleqr-pg \
  -e POSTGRES_USER=styleqr \
  -e POSTGRES_PASSWORD=CHANGE_ME \
  -e POSTGRES_DB=styleqr_prod \
  -p 5432:5432 \
  postgres:16-alpine
```

---

## 2. Create database and user

```bash
sudo -u postgres psql
```

In `psql`:

```sql
CREATE USER styleqr WITH PASSWORD 'your_secure_password';
CREATE DATABASE styleqr_prod OWNER styleqr;
GRANT ALL PRIVILEGES ON DATABASE styleqr_prod TO styleqr;
\q
```

---

## 3. Set `DATABASE_URL`

In `.env` (or your deployment env):

```
DATABASE_URL="postgresql://styleqr:your_secure_password@localhost:5432/styleqr_prod?schema=public&connection_limit=20&connect_timeout=10"
```

- `schema=public` – default schema
- `connection_limit=20` – Prisma connection pool size (tune to your load)
- `connect_timeout=10` – max seconds to wait for a new connection

For a pooled URL (e.g. PgBouncer), use the pooler host/port and omit `connection_limit` if the pooler manages it.

---

## 4. Migrate

```bash
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` applies all migrations in `prisma/migrations/` and does not create new ones.

---

## 5. Seed (optional)

```bash
# Admin user
npm run seed:admin

# Or custom seed scripts
# ts-node scripts/your-seed.ts
```

---

## 6. Run the app

```bash
npm run build
npm run start
```

Or in development:

```bash
npm run dev
```

---

## Connection pool and warmup

- **Pool:** Prisma uses the `connection_limit` in `DATABASE_URL` as the pool size. For many serverless/Next.js processes, 10–20 is usually enough per instance.
- **Warmup:** `instrumentation.ts` runs `prisma.$connect()` when the Node server starts so the first request does not pay connection setup cost.

---

## Migrating from SQLite

1. Export data from SQLite (scripts/custom or `sqlite3` + CSV).
2. Create the Postgres DB and run `prisma migrate deploy`.
3. Import into Postgres (scripts/custom or `psql`/`COPY`).
4. Point `DATABASE_URL` at Postgres and restart the app.

Schema and API stay the same; only the DB driver and migrations (now in `prisma/migrations/`) are for PostgreSQL.
