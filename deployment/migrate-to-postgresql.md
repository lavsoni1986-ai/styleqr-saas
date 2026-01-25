# Database Migration: SQLite → PostgreSQL

This guide explains how to migrate from SQLite (development) to PostgreSQL (production).

## Prerequisites

1. PostgreSQL installed on production server
2. Database created: `styleqr_prod`
3. Prisma configured for PostgreSQL

## Migration Steps

### Step 1: Update Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 2: Update DATABASE_URL

In production `.env`:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/styleqr_prod?schema=public"
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

### Step 4: Run Migrations

```bash
# Push schema to PostgreSQL (initial setup)
npx prisma db push

# OR create migration
npx prisma migrate dev --name init_postgresql
```

### Step 5: Migrate Data (If Existing)

If you have existing SQLite data to migrate:

```bash
# Export from SQLite
sqlite3 prisma/dev.db .dump > backup.sql

# Import to PostgreSQL (adjust SQL syntax as needed)
psql -h localhost -U postgres -d styleqr_prod -f backup.sql
```

### Step 6: Verify Migration

```bash
npx prisma studio
# Open http://localhost:5555
# Verify all tables and data
```

## Production Commands

```bash
# Run migrations in production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Rollback (If Needed)

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Or restore from backup
psql -h localhost -U postgres -d styleqr_prod < backup.sql
```
