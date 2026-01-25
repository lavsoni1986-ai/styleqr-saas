#!/bin/bash
# Database Backup Script for StyleQR SaaS
# Run daily via cron: 0 2 * * * /var/www/styleqr/deployment/database-backup.sh

set -e

APP_DIR="/var/www/styleqr"
BACKUP_DIR="/var/backups/styleqr"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "💾 Starting database backup..."

cd "$APP_DIR"

# Load environment variables
source .env

# Get database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# PostgreSQL backup
if [[ "$DATABASE_URL" == postgresql* ]]; then
    echo "📦 Backing up PostgreSQL database..."
    
    # Extract connection details
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    BACKUP_FILE="$BACKUP_DIR/styleqr_db_$DATE.sql.gz"
    
    PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"
    
    echo "✅ Backup created: $BACKUP_FILE"
    
# SQLite backup
elif [[ "$DATABASE_URL" == file:* ]]; then
    echo "📦 Backing up SQLite database..."
    
    DB_FILE=$(echo $DATABASE_URL | sed 's/file:\(.*\)/\1/')
    BACKUP_FILE="$BACKUP_DIR/styleqr_db_$DATE.db.gz"
    
    gzip -c "$DB_FILE" > "$BACKUP_FILE"
    
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "❌ Unknown database type in DATABASE_URL"
    exit 1
fi

# Clean old backups (keep last 30 days)
echo "🧹 Cleaning old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "styleqr_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "styleqr_db_*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup complete!"

# Optional: Upload to S3 or remote storage
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
