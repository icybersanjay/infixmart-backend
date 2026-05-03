# InfixMart Backups Runbook

This document describes how to back up and restore the InfixMart production database and uploads on Hostinger.

> **Important:** Image uploads are stored on the local filesystem at `UPLOADS_DIR` (default `/home/u633621486/uploads`). Do not relocate these. Backups must include this directory or product images will go missing on restore.

---

## What to back up

| Asset | Where | Frequency | Retention |
|---|---|---|---|
| MySQL database | Hostinger MySQL panel | Daily | 30 days |
| Uploads directory | `$UPLOADS_DIR` (e.g. `/home/u633621486/uploads`) | Daily | 30 days |
| `.env.local` (secrets) | Hostinger file manager | After every change | Permanent (encrypted store) |
| `next.config.mjs`, `db/schema.sql`, `db/migrate.sql` | Git | Every commit | Permanent (Git history) |

---

## Database backup

### Option A — Hostinger panel (recommended for non-technical users)

1. Hostinger → **Hosting → Manage → Files → Backups**.
2. Hostinger keeps automatic weekly backups for the database.
3. To take an on-demand backup: **Hosting → MySQL Databases → Manage → Export**, choose "SQL", "All tables", "Add DROP TABLE", "Save as file", and download.
4. Store the resulting `.sql` file in your password manager / secure cloud (not in Git).

### Option B — `mysqldump` over SSH (preferred for automation)

1. SSH into Hostinger (use your Hosting username + password from the panel).
2. Use the helper script below: `scripts/backup-db.sh`.

```bash
bash scripts/backup-db.sh
```

This writes a gzipped dump to `~/backups/db-YYYY-MM-DD-HHMMSS.sql.gz` and keeps the latest 30.

### Option C — Schedule via cron

In Hostinger panel → **Advanced → Cron Jobs**:

| Field | Value |
|---|---|
| Command | `bash $HOME/public_html/scripts/backup-db.sh` |
| Minute | `0` |
| Hour | `3` |
| Day | `*` |
| Month | `*` |
| Weekday | `*` |

This runs daily at 03:00 server time. The script keeps the last 30 backups under `~/backups/`.

---

## Uploads backup

The uploads directory is **outside** `public_html` (at `$UPLOADS_DIR`). Add a separate cron:

| Field | Value |
|---|---|
| Command | `bash $HOME/public_html/scripts/backup-uploads.sh` |
| Minute | `15` |
| Hour | `3` |
| Day | `*` |
| Month | `*` |
| Weekday | `*` |

This snapshots `$UPLOADS_DIR` to `~/backups/uploads-YYYY-MM-DD.tar.gz` and keeps the last 14.

---

## Restore drill

> Run a restore drill at least once per quarter on a **non-production database** to confirm the backups are valid.

### Database restore

1. Create a fresh empty database in Hostinger panel (e.g. `infixmart_restore_test`).
2. Decompress the dump: `gunzip -c db-YYYY-MM-DD-HHMMSS.sql.gz > restore.sql`
3. Import: phpMyAdmin → select the restore database → **Import** → choose `restore.sql`.
4. Spot-check: count rows in `Users`, `Orders`, `Products` and confirm they match the source database at backup time.

### Uploads restore

1. Decompress: `tar -xzf uploads-YYYY-MM-DD.tar.gz -C /tmp/uploads-restore`
2. Verify a sample of files: `ls /tmp/uploads-restore | head` and open one image.
3. To replace production uploads (only on a real disaster), `rsync -av /tmp/uploads-restore/ $UPLOADS_DIR/`. Stop and start the Node app afterwards.

---

## Pre-deploy snapshot (manual)

Before any database migration (anything in `db/migrate.sql`), take an on-demand backup of both the DB and uploads, even if cron has run today.

```bash
bash scripts/backup-db.sh
bash scripts/backup-uploads.sh
```

Confirm both files appeared under `~/backups/` before running the migration.

---

## Backup script: `scripts/backup-db.sh`

Save this as `scripts/backup-db.sh`. Replace `MYSQL_USER` / `MYSQL_PASS` / `MYSQL_DB` with the values from `.env.local` (or read them from there).

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${HOME}/backups"
mkdir -p "${BACKUP_DIR}"

# Read DB creds from env.local (one source of truth)
ENV_FILE="${HOME}/public_html/.env.local"
if [ -f "${ENV_FILE}" ]; then
  set -a; source "${ENV_FILE}"; set +a
fi

: "${MYSQL_HOST:=localhost}"
: "${MYSQL_USER:?MYSQL_USER not set}"
: "${MYSQL_PASS:?MYSQL_PASS not set}"
: "${MYSQL_DB:?MYSQL_DB not set}"

STAMP="$(date +%F-%H%M%S)"
OUT="${BACKUP_DIR}/db-${STAMP}.sql.gz"

mysqldump \
  --host="${MYSQL_HOST}" \
  --user="${MYSQL_USER}" \
  --password="${MYSQL_PASS}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  "${MYSQL_DB}" | gzip -9 > "${OUT}"

echo "Wrote ${OUT}"

# Keep last 30 backups
ls -1t "${BACKUP_DIR}"/db-*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
```

Mark executable: `chmod +x scripts/backup-db.sh`.

---

## Backup script: `scripts/backup-uploads.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${HOME}/backups"
mkdir -p "${BACKUP_DIR}"

ENV_FILE="${HOME}/public_html/.env.local"
if [ -f "${ENV_FILE}" ]; then
  set -a; source "${ENV_FILE}"; set +a
fi

: "${UPLOADS_DIR:=${HOME}/uploads}"

STAMP="$(date +%F)"
OUT="${BACKUP_DIR}/uploads-${STAMP}.tar.gz"

tar -czf "${OUT}" -C "$(dirname "${UPLOADS_DIR}")" "$(basename "${UPLOADS_DIR}")"

echo "Wrote ${OUT}"

# Keep last 14 days of uploads backups
ls -1t "${BACKUP_DIR}"/uploads-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
```

Mark executable: `chmod +x scripts/backup-uploads.sh`.

---

## Off-site copy (recommended)

Hostinger backups live on the same provider. For real disaster recovery, copy weekly DB dumps to a second location:

- Email the dump to a secure mailbox (use `mutt` or similar; the Hostinger SSH does not allow attachments via SMTP, so prefer `rclone`).
- Or set up `rclone` to push to Google Drive / Dropbox / S3-compatible storage.

A minimal cron addition:

```
0 4 * * 0  rclone copy $HOME/backups/ remote:infixmart-backups/
```

(Runs Sundays at 04:00 after the daily DB and uploads backups have run.)
