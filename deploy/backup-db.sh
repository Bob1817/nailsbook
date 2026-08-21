#!/bin/bash
BACKUP_DIR=/opt/nailbook/backups
DB_PATH=/var/lib/docker/volumes/nailbook_backend_db/_data/prod.db
TIMESTAMP=\$(date '+%Y%m%d_%H%M%S')
mkdir -p $BACKUP_DIR
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_DIR/prod_$TIMESTAMP.db"
    echo "[$TIMESTAMP] 备份完成"
    ls -t $BACKUP_DIR/prod_*.db | tail -n +31 | xargs -r rm
fi
