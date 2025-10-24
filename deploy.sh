#!/bin/bash

# Journal App Deployment Script
# Usage: ./deploy.sh [branch]
# Default branch: master

set -e  # Exit on any error

BRANCH=${1:-master}
PROJECT_DIR="/opt/journal"
BACKUP_DIR="$HOME/journal-backups"

echo "=========================================="
echo "Journal App Deployment"
echo "Branch: $BRANCH"
echo "Started at: $(date)"
echo "=========================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Step 1: Backup current database
echo "[1/8] Backing up database..."
BACKUP_FILE="$BACKUP_DIR/journal-db-$(date +%Y%m%d_%H%M%S).sql.gz"
sudo -u postgres pg_dump journal | gzip > "$BACKUP_FILE"
echo "Database backed up to: $BACKUP_FILE"

# Step 2: Pull latest code
echo "[2/8] Pulling latest code from GitHub..."
cd "$PROJECT_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Step 3: Install/update backend dependencies
echo "[3/8] Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install --production

# Step 4: Install/update frontend dependencies
echo "[4/8] Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm install

# Step 5: Build frontend
echo "[5/8] Building frontend..."
npm run build

# Step 6: Restart backend
echo "[6/8] Restarting backend..."
pm2 restart journal-backend

# Step 7: Restart frontend
echo "[7/8] Restarting frontend..."
pm2 restart journal-frontend

# Step 8: Verify services
echo "[8/8] Verifying services..."
sleep 3

if pm2 list | grep -q "journal-backend.*online"; then
    echo "✓ Backend is online"
else
    echo "✗ Backend failed to start!"
    pm2 logs journal-backend --lines 20 --nostream
    exit 1
fi

if pm2 list | grep -q "journal-frontend.*online"; then
    echo "✓ Frontend is online"
else
    echo "✗ Frontend failed to start!"
    pm2 logs journal-frontend --lines 20 --nostream
    exit 1
fi

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "Completed at: $(date)"
echo "=========================================="
echo "App URL: https://journal.azyr.io"
echo "Database backup: $BACKUP_FILE"
echo ""
echo "To view logs:"
echo "  pm2 logs journal-backend"
echo "  pm2 logs journal-frontend"
echo ""
echo "To rollback database if needed:"
echo "  gunzip < $BACKUP_FILE | sudo -u postgres psql -d journal"
