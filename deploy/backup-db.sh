#!/bin/bash
set -euo pipefail
umask 077
export BACKUP_DIR="${BACKUP_DIR:-/opt/nailbook/backups}"
export DB_PATH="${DB_PATH:-/var/lib/docker/volumes/nailbook_backend_db/_data/prod.db}"
# SQLite online backup includes committed WAL data; never copy a live DB file.
python3 - <<'PY'
import os, sqlite3
from datetime import datetime
from pathlib import Path

source = Path(os.environ['DB_PATH']).resolve(strict=True)
directory = Path(os.environ['BACKUP_DIR'])
directory.mkdir(parents=True, exist_ok=True)
target = directory / ('prod_' + datetime.now().strftime('%Y%m%d_%H%M%S_%f') + '.db')
try:
    with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as src:
        with sqlite3.connect(target) as dst:
            src.backup(dst)
            if dst.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('Backup integrity check failed')
except Exception:
    target.unlink(missing_ok=True)
    raise
print('备份完成：' + str(target))
# Prune only after a verified backup exists; retain the latest 30 snapshots.
for old in sorted(directory.glob('prod_*.db'), key=lambda p: p.stat().st_mtime, reverse=True)[30:]:
    old.unlink()
PY
