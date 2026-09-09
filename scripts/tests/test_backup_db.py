import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'deploy/backup-db.sh'


class BackupDatabaseTest(unittest.TestCase):
    def test_live_wal_backup_is_restorable_and_retains_30_snapshots(self):
        with tempfile.TemporaryDirectory(prefix='nailbook backup ') as tmp:
            root = Path(tmp)
            source = root / 'source.db'
            backups = root / 'backups'
            backups.mkdir()
            for i in range(31):
                old = backups / f'prod_old_{i:02}.db'
                old.touch()
                os.utime(old, (i + 1, i + 1))
            unrelated = backups / 'keep.txt'
            unrelated.write_text('keep')
            db = sqlite3.connect(source)
            try:
                db.execute('PRAGMA journal_mode=WAL')
                db.execute('CREATE TABLE orders (id INTEGER, amount INTEGER)')
                db.execute('INSERT INTO orders VALUES (1, 79800)')
                db.commit()
                self.assertTrue(Path(str(source) + '-wal').exists())
                result = subprocess.run(['bash', str(SCRIPT)], env={
                    **os.environ, 'DB_PATH': str(source), 'BACKUP_DIR': str(backups)
                }, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                snapshots = list(backups.glob('prod_*.db'))
                self.assertEqual(len(snapshots), 30)
                newest = max(snapshots, key=lambda p: p.stat().st_mtime)
                with sqlite3.connect(newest) as restored:
                    self.assertEqual(restored.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
                    self.assertEqual(restored.execute('SELECT * FROM orders').fetchall(), [(1, 79800)])
                self.assertEqual(newest.stat().st_mode & 0o777, 0o600)
                self.assertTrue(unrelated.exists())
            finally:
                db.close()

    def test_missing_source_fails_without_creating_a_database(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'missing.db'
            result = subprocess.run(['bash', str(SCRIPT)], env={
                **os.environ, 'DB_PATH': str(source), 'BACKUP_DIR': str(Path(tmp) / 'backups')
            }, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(source.exists())


if __name__ == '__main__':
    unittest.main()
