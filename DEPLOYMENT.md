# Journal Application - Deployment Documentation

This document provides complete reference for the deployed journal application at **https://journal.azyr.io**.

## Table of Contents
- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Development & Deployment Workflow](#development--deployment-workflow)
- [Critical File Locations](#critical-file-locations)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Process Management](#process-management)
- [Nginx Configuration](#nginx-configuration)
- [Common Operations](#common-operations)
- [Troubleshooting](#troubleshooting)
- [Backup & Restore](#backup--restore)

## System Overview

**Journal** is a digital journaling application deployed on the azyr.io production server. It runs completely isolated from the main azyr.io website and other applications (YouTube/GitHub analytics).

- **Public URL**: https://journal.azyr.io
- **Tech Stack**:
  - Frontend: Remix (React Router) + TypeScript + TipTap editor
  - Backend: Hapi.js (Node.js)
  - Database: PostgreSQL 16
  - Process Manager: PM2
  - Reverse Proxy: Nginx
- **Authentication**: Google OAuth 2.0 + JWT
- **Deployment Date**: October 23, 2025

## Architecture

### Isolation Strategy

The journal app is fully isolated from other server applications:

```
Internet → Cloudflare CDN → Nginx (journal.azyr.io:443)
                              ├─ /api/* → Backend (localhost:3002)
                              └─ /* → Frontend (localhost:3003)
                                        ├─ Database (localhost:5432)
                                        └─ PostgreSQL (journal database)
```

**Port Allocation:**
- Frontend: 3003 (Remix SSR)
- Backend: 3002 (Hapi.js API)
- Webhook: 9000 (GitHub webhook listener)
- Database: 5432 (PostgreSQL default)

**Other apps on server:**
- YouTube Analytics: 3000
- GitHub Analytics: 3001

## Development & Deployment Workflow

### Overview

The journal application uses **automated deployment via GitHub webhooks**. When you push code to the `master` branch, it automatically deploys to production.

```
Local Development → Git Push → GitHub → Webhook → Auto-Deploy → Live
```

### Local Development Setup

**1. Clone the repository:**
```bash
git clone https://github.com/FedeIII/journal.git
cd journal
```

**2. Set up local environment:**

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env with local values:
# - DATABASE_URL=postgresql://journal_user:journal_password@localhost:5433/journal
# - PORT=3001
# - GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
# - FRONTEND_URL=http://localhost:3000
npm install
npm run dev  # Starts on port 3001
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# Edit .env:
# - API_URL=http://localhost:3001
npm install
npm run dev  # Starts on port 3000
```

**Database (Docker):**
```bash
# From project root
docker-compose up -d
# Creates PostgreSQL on port 5433
```

**3. Access locally:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### Automated Deployment (Recommended)

**How it works:**

1. **You push code to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin master
   ```

2. **GitHub sends webhook** to `https://journal.azyr.io/webhook`

3. **Webhook server** (`journal-webhook` PM2 process) receives and verifies the request

4. **Deploy script** (`/opt/journal/deploy.sh`) runs automatically:
   - Backs up database
   - Pulls latest code from GitHub
   - Installs dependencies
   - Builds frontend
   - Restarts PM2 processes
   - Verifies services are online

5. **Changes are live** within 1-2 minutes

**GitHub Webhook Configuration:**

Already configured in GitHub repository settings (`https://github.com/FedeIII/journal/settings/hooks`):

- **Payload URL**: `https://journal.azyr.io/webhook`
- **Content type**: `application/json`
- **Secret**: `5edaed67d5a602dd1b0336d76c1521b91d38420ad223e00f3a67da95537d33ef`
- **Events**: Push events only
- **Active**: ✅

**Monitor deployments:**
```bash
# SSH into VPS
ssh root@46.224.16.48

# Watch webhook activity
pm2 logs journal-webhook

# Watch deployment progress
tail -f /tmp/journal-deploy.log

# Check last deployment
ls -lt ~/journal-backups/ | head -5
```

### Manual Deployment

If the webhook fails or you need to deploy manually:

```bash
# SSH into VPS
ssh root@46.224.16.48

# Run deployment script
cd /opt/journal
./deploy.sh

# Or specify branch
./deploy.sh main
```

**The deploy script performs:**
1. Database backup to `~/journal-backups/`
2. Git pull from specified branch
3. Backend: `npm install --production`
4. Frontend: `npm install && npm run build`
5. Restart: `pm2 restart journal-backend journal-frontend`
6. Verification of process status

### Direct VPS Development (Not Recommended)

For emergency quick fixes only. Code will be out of sync with GitHub.

```bash
# SSH into VPS
ssh root@46.224.16.48

# Edit code directly
cd /opt/journal/backend
nano src/routes/auth.js

# Restart backend
pm2 restart journal-backend

# For frontend changes, rebuild required
cd /opt/journal/frontend
nano app/components/Editor.tsx
npm run build
pm2 restart journal-frontend

# IMPORTANT: Sync back to GitHub
git add .
git commit -m "Emergency fix: description"
git push origin master
```

### Deployment Checklist

**Before pushing:**
- ✅ Test changes locally (http://localhost:3000)
- ✅ Check backend logs for errors
- ✅ Verify database migrations work
- ✅ Update environment variables if needed

**After deployment:**
- ✅ Check webhook logs: `pm2 logs journal-webhook`
- ✅ Verify deployment completed: `tail -f /tmp/journal-deploy.log`
- ✅ Test live site: https://journal.azyr.io
- ✅ Check PM2 status: `pm2 status`
- ✅ Review logs: `pm2 logs journal-backend journal-frontend --lines 50`

### Rollback Procedure

If a deployment breaks production:

**Option 1: Rollback to previous Git commit**
```bash
ssh root@46.224.16.48
cd /opt/journal

# View recent commits
git log --oneline -10

# Rollback to specific commit
git checkout <commit-hash>
./deploy.sh
```

**Option 2: Restore database backup**
```bash
# List backups
ls -lt ~/journal-backups/

# Restore
gunzip < ~/journal-backups/journal-db-YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql -d journal
pm2 restart journal-backend journal-frontend
```

### Webhook Server Details

**Process:** `journal-webhook` (PM2)
**Port:** 9000 (localhost only, proxied via nginx)
**Script:** `/opt/journal/webhook-server.js`
**Logs:** `pm2 logs journal-webhook`

**How it works:**
- Listens for POST requests to `/webhook`
- Verifies GitHub signature using `WEBHOOK_SECRET`
- Only triggers on pushes to `master` or `main` branch
- Runs deploy script in background
- Returns immediate response to GitHub

**Restarting webhook server:**
```bash
pm2 restart journal-webhook

# Or with updated secret
pm2 delete journal-webhook
cd /opt/journal
WEBHOOK_SECRET=<your-secret> pm2 start webhook-server.js --name journal-webhook
pm2 save
```

### Environment Variables for Deployment

**Production (.env files are NOT in git):**

After deployment, verify environment variables are correct:
```bash
cat /opt/journal/backend/.env
cat /opt/journal/frontend/.env
```

If environment variables change, update files and restart:
```bash
nano /opt/journal/backend/.env
pm2 restart journal-backend

# Frontend needs deletion/recreation for env vars
pm2 delete journal-frontend
cd /opt/journal/frontend
API_URL=https://journal.azyr.io PORT=3003 pm2 start npm --name journal-frontend -- start
pm2 save
```

### Troubleshooting Deployments

**Webhook not triggering:**
```bash
# Check webhook server is running
pm2 list | grep journal-webhook

# Check webhook logs
pm2 logs journal-webhook --lines 50

# Test webhook manually
curl -X POST https://journal.azyr.io/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Should return "Unauthorized" (expected, no signature)
```

**Deployment fails:**
```bash
# Check deploy logs
tail -100 /tmp/journal-deploy.log

# Common issues:
# 1. Git conflicts - resolve in /opt/journal/
# 2. npm install fails - check package.json
# 3. Build fails - check frontend code
# 4. PM2 restart fails - check logs
```

**PM2 processes not starting after deployment:**
```bash
# Check individual logs
pm2 logs journal-backend --lines 50
pm2 logs journal-frontend --lines 50

# Common causes:
# - Database connection failed
# - Port already in use
# - Missing environment variables
# - Syntax errors in code
```

## Critical File Locations

### Application Files
- **Root directory**: `/opt/journal/`
- **Backend code**: `/opt/journal/backend/`
- **Frontend code**: `/opt/journal/frontend/`
- **Database init scripts**: `/opt/journal/database/init/`

### Deployment Files
- **Webhook server**: `/opt/journal/webhook-server.js`
- **Deploy script**: `/opt/journal/deploy.sh`
- **Deploy log**: `/tmp/journal-deploy.log`
- **Database backups**: `~/journal-backups/`

### Configuration Files
- **Backend .env**: `/opt/journal/backend/.env`
- **Frontend .env**: `/opt/journal/frontend/.env`
- **Nginx config**: `/etc/nginx/sites-available/journal.azyr.io` (symlinked to sites-enabled)

### Logs
- **Backend logs**: `pm2 logs journal-backend` or `/root/.pm2/logs/journal-backend-{out,error}.log`
- **Frontend logs**: `pm2 logs journal-frontend` or `/root/.pm2/logs/journal-frontend-{out,error}.log`
- **Webhook logs**: `pm2 logs journal-webhook` or `/root/.pm2/logs/journal-webhook-{out,error}.log`
- **Nginx access**: `/var/log/nginx/journal.azyr.io.access.log`
- **Nginx error**: `/var/log/nginx/journal.azyr.io.error.log`

### SSL Certificates
Uses the wildcard Cloudflare Origin Certificate for `*.azyr.io`:
- **Certificate**: `/etc/nginx/ssl/azyr.io.pem`
- **Private key**: `/etc/nginx/ssl/azyr.io.key`

## Environment Configuration

### Backend Environment Variables (`/opt/journal/backend/.env`)

```bash
DATABASE_URL=postgresql://journal_user:YOUR_DB_PASSWORD@localhost:5432/journal
PORT=3002
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
NODE_ENV=production
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://journal.azyr.io/api/auth/google/callback
FRONTEND_URL=https://journal.azyr.io
```

**Key Points:**
- `DATABASE_URL`: Direct connection to local PostgreSQL
- `PORT`: Backend listens on 3002 (isolated from other apps)
- `JWT_SECRET`: Securely generated 64-character hex string
- `GOOGLE_REDIRECT_URI`: Must match OAuth app configuration in Google Cloud Console
- `FRONTEND_URL`: Used for CORS and redirects

### Frontend Environment Variables (`/opt/journal/frontend/.env`)

```bash
API_URL=https://journal.azyr.io
```

**Why this value:**
- Frontend uses SSR (Server-Side Rendering)
- Browser-side requests need the public URL
- Nginx routes `/api/*` to backend on localhost:3002
- This avoids CORS issues and maintains security

**Important:** PM2 must be started with this environment variable:
```bash
cd /opt/journal/frontend
API_URL=https://journal.azyr.io PORT=3003 pm2 start npm --name journal-frontend -- start
```

## Database Setup

### PostgreSQL Configuration

**Database Details:**
- **Database name**: `journal`
- **User**: `journal_user`
- **Password**: `journal_password`
- **Host**: `localhost` (not exposed externally)
- **Port**: `5432`

### Schema

Created via `/opt/journal/database/init/01-schema.sql`:

**Tables:**
1. `users` - User accounts (email/password or Google OAuth)
2. `journal_entries` - Daily journal entries with JSONB content

**Key Features:**
- Unique constraint on `(user_id, entry_date)` - one entry per day per user
- JSONB storage for TipTap editor content
- Auto-updating `updated_at` timestamps via triggers
- Proper indexes on frequently queried fields

### Database Permissions

**Critical:** The `journal_user` needs full permissions on tables and sequences:

```sql
-- Granted during setup:
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO journal_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO journal_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO journal_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO journal_user;
```

**Without these permissions**, the app will return 500 errors on registration/login.

### Connecting to Database

**From the server:**
```bash
sudo -u postgres psql -d journal
```

**From your local machine (via SSH tunnel):**

Use pgAdmin or any PostgreSQL client with these settings:

**Connection Tab:**
- Host: `localhost`
- Port: `5432`
- Database: `journal`
- Username: `journal_user`
- Password: `journal_password`

**SSH Tunnel Tab:**
- Use SSH tunneling: ✅ Enabled
- Tunnel host: `46.224.16.48`
- Tunnel port: `22`
- Username: `root`
- Identity file: `/Users/fede/.ssh/id_rsa` (or your SSH key path)
- Passphrase: Your SSH key passphrase

## Process Management

### PM2 Processes

The journal app runs as three PM2 processes:

```bash
pm2 status
# ├─ journal-backend  (id: 2, port 3002)
# ├─ journal-frontend (id: 5, port 3003)
# └─ journal-webhook  (id: 6, port 9000)
```

### Starting the Application

**Backend:**
```bash
cd /opt/journal/backend
pm2 start src/index.js --name journal-backend
```

**Frontend:**
```bash
cd /opt/journal/frontend
API_URL=https://journal.azyr.io PORT=3003 pm2 start npm --name journal-frontend -- start
```

**Webhook Server:**
```bash
cd /opt/journal
WEBHOOK_SECRET=5edaed67d5a602dd1b0336d76c1521b91d38420ad223e00f3a67da95537d33ef pm2 start webhook-server.js --name journal-webhook
```

**Save configuration:**
```bash
pm2 save
```

### Managing Processes

```bash
# View status
pm2 status

# View logs (live tail)
pm2 logs journal-backend
pm2 logs journal-frontend

# View last 50 lines
pm2 logs journal-backend --lines 50 --nostream

# Restart processes
pm2 restart journal-backend
pm2 restart journal-frontend

# Stop processes
pm2 stop journal-backend
pm2 stop journal-frontend

# Delete processes (to recreate with new env vars)
pm2 delete journal-backend
pm2 delete journal-frontend
```

### Auto-restart on Server Reboot

PM2 is configured to start automatically via systemd:
```bash
pm2 startup  # Already configured
pm2 save     # Run after any process changes
```

## Nginx Configuration

### Configuration File

Location: `/etc/nginx/sites-available/journal.azyr.io`

**Key sections:**

1. **HTTP to HTTPS redirect** (port 80)
2. **HTTPS server** (port 443)
   - SSL with Cloudflare Origin Certificate
   - Security headers
   - Reverse proxy rules

### Reverse Proxy Rules

```nginx
# API routes → Backend (port 3002)
location /api/ {
    proxy_pass http://localhost:3002;
    # ... proxy headers
}

# All other routes → Frontend (port 3003)
location / {
    proxy_pass http://localhost:3003;
    # ... proxy headers
}
```

### Cloudflare Integration

**Important:** Cloudflare Real IP restoration is now configured globally in `/etc/nginx/nginx.conf` (not in individual site configs) to avoid duplication.

**SSL Mode:** Cloudflare Dashboard must be set to **"Full (strict)"** for journal.azyr.io.

### Modifying Nginx Configuration

**Always follow this workflow:**

```bash
# 1. Edit config
nano /etc/nginx/sites-available/journal.azyr.io

# 2. Test syntax
nginx -t

# 3. Apply changes
systemctl reload nginx
```

**Never skip step 2** - a syntax error will prevent nginx from starting.

### Testing Nginx Locally

```bash
# Test frontend route
curl -k -H "Host: journal.azyr.io" https://localhost/

# Test API route
curl -k -H "Host: journal.azyr.io" https://localhost/api/health

# Check proxy headers
curl -k -H "Host: journal.azyr.io" -I https://localhost/
```

## Common Operations

### Viewing Logs

```bash
# Backend logs (live)
pm2 logs journal-backend

# Frontend logs (live)
pm2 logs journal-frontend

# Nginx access log (live)
tail -f /var/log/nginx/journal.azyr.io.access.log

# Nginx error log (live)
tail -f /var/log/nginx/journal.azyr.io.error.log

# All journal app logs together
pm2 logs --raw | grep journal-
```

### Restarting Services

```bash
# After code changes
cd /opt/journal/backend && npm install && pm2 restart journal-backend
cd /opt/journal/frontend && npm install && npm run build && pm2 restart journal-frontend

# After nginx config changes
nginx -t && systemctl reload nginx

# After database changes
sudo systemctl restart postgresql
```

### Checking Service Status

```bash
# PM2 processes
pm2 status

# Nginx
systemctl status nginx
curl -I https://journal.azyr.io

# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -d journal -c "\dt"

# All ports
netstat -tlnp | grep -E "3002|3003|5432"
```

### Updating Code from GitHub

```bash
cd /opt/journal

# Pull latest changes
git pull origin master

# Backend updates
cd backend
npm install
pm2 restart journal-backend

# Frontend updates (requires rebuild)
cd ../frontend
npm install
npm run build
pm2 restart journal-frontend

# Verify
pm2 logs journal-backend --lines 20 --nostream
pm2 logs journal-frontend --lines 20 --nostream
```

### Database Operations

```bash
# Connect to database
sudo -u postgres psql -d journal

# List tables
\dt

# Check user permissions
\dp users

# View recent users
SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 10;

# Count journal entries
SELECT COUNT(*) FROM journal_entries;

# Database backup
sudo -u postgres pg_dump journal > ~/journal-backup-$(date +%Y%m%d).sql

# Database restore
sudo -u postgres psql -d journal < ~/journal-backup-YYYYMMDD.sql
```

## Troubleshooting

### Frontend shows "API Error" or 500 responses

**Check backend logs:**
```bash
pm2 logs journal-backend --lines 50
```

**Common causes:**
- Database connection failed
- Missing environment variables
- Database permission errors

**Fix database permissions:**
```bash
sudo -u postgres psql -d journal -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO journal_user;"
sudo -u postgres psql -d journal -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO journal_user;"
pm2 restart journal-backend
```

### "No route matches" errors in frontend

**Symptom:** 404 errors in PM2 logs for `/favicon.ico` or other routes.

**Diagnosis:** This is normal for missing favicon. Real routing errors will show different patterns.

**Check:** Visit https://journal.azyr.io directly in browser. If the app loads, routes are working.

### Google OAuth not working

**Check redirect URI matches:**
- `.env`: `GOOGLE_REDIRECT_URI=https://journal.azyr.io/api/auth/google/callback`
- Google Cloud Console: Authorized redirect URIs must include exact URL above

**Test OAuth endpoint:**
```bash
curl -I https://journal.azyr.io/api/auth/google
```

Should return 302 redirect to Google.

### 502 Bad Gateway from Cloudflare

**Cause:** Backend or frontend process crashed.

**Check:**
```bash
pm2 status
# Look for status != "online"

pm2 logs journal-backend --lines 50
pm2 logs journal-frontend --lines 50
```

**Fix:**
```bash
pm2 restart journal-backend
pm2 restart journal-frontend
```

### Database connection refused

**Check PostgreSQL is running:**
```bash
sudo systemctl status postgresql
```

**Check connection from backend:**
```bash
cd /opt/journal/backend
node -e "const pg = require('pg'); const pool = new pg.Pool({connectionString: process.env.DATABASE_URL || 'postgresql://journal_user:journal_password@localhost:5432/journal'}); pool.query('SELECT NOW()', (err, res) => { console.log(err || res.rows); pool.end(); })"
```

### Environment variables not updating

**Problem:** Changed `.env` file but app still uses old values.

**Cause:** PM2 doesn't reload environment variables on restart.

**Fix:**
```bash
# Delete and recreate process
pm2 delete journal-frontend
cd /opt/journal/frontend
API_URL=https://journal.azyr.io PORT=3003 pm2 start npm --name journal-frontend -- start
pm2 save
```

### Nginx "duplicate directive" errors

**Cause:** Cloudflare IP directives duplicated across configs.

**Fix:** Cloudflare Real IP settings are now in `/etc/nginx/nginx.conf` (global). Remove from individual site configs.

```bash
nginx -t  # Will show which file has the duplicate
```

## Backup & Restore

### Full Application Backup

```bash
# Create timestamped backup
tar -czf ~/journal-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
    /opt/journal/ \
    /etc/nginx/sites-available/journal.azyr.io \
    --exclude=/opt/journal/node_modules \
    --exclude=/opt/journal/frontend/node_modules \
    --exclude=/opt/journal/backend/node_modules

# Backup database separately
sudo -u postgres pg_dump journal | gzip > ~/journal-db-$(date +%Y%m%d_%H%M%S).sql.gz
```

### Database-Only Backup

```bash
# Backup
sudo -u postgres pg_dump journal > ~/journal-db-backup.sql

# Restore
sudo -u postgres psql -d journal < ~/journal-db-backup.sql
```

### Restore from Backup

```bash
# Stop services
pm2 stop journal-backend journal-frontend

# Restore files
tar -xzf ~/journal-backup-YYYYMMDD_HHMMSS.tar.gz -C /

# Restore database
gunzip < ~/journal-db-YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql -d journal

# Reinstall dependencies
cd /opt/journal/backend && npm install
cd /opt/journal/frontend && npm install && npm run build

# Restart services
pm2 restart journal-backend journal-frontend

# Verify
pm2 status
curl -I https://journal.azyr.io
```

## Security Notes

### Sensitive Files (Never Commit to Git)

- `/opt/journal/backend/.env` - Contains secrets
- `/opt/journal/frontend/.env` - Contains API URL
- `/etc/nginx/ssl/azyr.io.key` - SSL private key
- Database credentials

### OAuth Security

Google OAuth credentials are configured for:
- **Authorized origins**: `https://journal.azyr.io`
- **Authorized redirect URIs**: `https://journal.azyr.io/api/auth/google/callback`

**Never** share `GOOGLE_CLIENT_SECRET` or commit to version control.

### Database Security

- PostgreSQL only listens on `localhost` (not exposed to internet)
- Remote access only via SSH tunnel
- `journal_user` has access only to `journal` database (not superuser)

### SSL/TLS

- Cloudflare Origin Certificate (15-year validity)
- TLS 1.2 and 1.3 only
- Strict mode in Cloudflare Dashboard

## Performance Monitoring

### Check Resource Usage

```bash
# PM2 monitoring
pm2 monit

# Process memory/CPU
pm2 status
ps aux | grep -E "journal|postgres"

# Nginx connections
netstat -an | grep :443 | wc -l

# Database connections
sudo -u postgres psql -d journal -c "SELECT count(*) FROM pg_stat_activity;"
```

### Log Rotation

PM2 logs can grow large. To manage:

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure (keep 7 days, max 10MB per file)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Maintenance Checklist

### Weekly
- [ ] Check PM2 process status: `pm2 status`
- [ ] Review error logs: `pm2 logs --err --lines 100`
- [ ] Verify site is accessible: `curl -I https://journal.azyr.io`

### Monthly
- [ ] Database backup: `sudo -u postgres pg_dump journal > ~/journal-backup-monthly.sql`
- [ ] Update npm dependencies: `npm outdated` in both backend/frontend
- [ ] Check disk space: `df -h`
- [ ] Review nginx logs for errors: `tail -100 /var/log/nginx/journal.azyr.io.error.log`

### As Needed
- [ ] Update OAuth credentials if changed
- [ ] Renew SSL certificate (every 15 years)
- [ ] Update Cloudflare IP ranges if notified

---

**Document Version**: 1.0
**Last Updated**: October 23, 2025
**Maintainer**: Claude Code
**Server**: azyr.io (46.224.16.48)
