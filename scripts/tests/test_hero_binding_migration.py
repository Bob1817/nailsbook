"""Verify the migration against legacy over-limit data without touching an app DB."""
import sqlite3
import unittest
from pathlib import Path

MIGRATION = Path(__file__).resolve().parents[2] / 'backend/prisma/migrations/20260908100000_hero_and_binding_limits/migration.sql'


class HeroBindingMigrationTest(unittest.TestCase):
    def test_legacy_backfill_and_capacity(self):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.executescript('''
          CREATE TABLE NailWork (id INTEGER PRIMARY KEY, techId INTEGER, isFeatured INTEGER DEFAULT 0,
            isVisible INTEGER DEFAULT 1, visibilityScope TEXT DEFAULT 'public', publicationStatus TEXT DEFAULT 'approved',
            archivedAt TEXT, coverUrl TEXT DEFAULT '/cover.jpg', sortOrder INTEGER DEFAULT 0, createdAt TEXT DEFAULT '2026-09-01');
          CREATE TABLE ClientTechBinding (id INTEGER PRIMARY KEY, clientId INTEGER, techId INTEGER, status TEXT);
        ''')
        db.executemany('INSERT INTO NailWork(id,techId,isFeatured) VALUES (?,1,1)', [(i,) for i in range(1,8)])
        db.execute("UPDATE NailWork SET publicationStatus='pending' WHERE id=7")
        db.executemany("INSERT INTO ClientTechBinding VALUES (?,1,?,'pending')", [(i,i) for i in range(1,7)])
        db.executescript(MIGRATION.read_text())
        self.assertEqual(db.execute('SELECT id,heroSlot FROM NailWork WHERE heroSlot IS NOT NULL ORDER BY heroSlot').fetchall(), [(6,1),(5,2),(4,3)])
        self.assertEqual(db.execute('SELECT count(*) FROM NailWork WHERE isFeatured=1').fetchone()[0], 7)
        self.assertEqual(db.execute('SELECT count(*) FROM ClientTechBinding').fetchone()[0], 6)
        db.execute("UPDATE ClientTechBinding SET status='active' WHERE id=1")
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'BINDING_CAPACITY_REACHED'):
            db.execute("INSERT INTO ClientTechBinding VALUES (8,1,8,'active')")
        db.execute("UPDATE ClientTechBinding SET status='inactive' WHERE id IN (1,2)")
        db.execute("INSERT INTO ClientTechBinding VALUES (8,1,8,'active')")
        self.assertEqual(db.execute("SELECT count(*) FROM ClientTechBinding WHERE status IN ('active','pending')").fetchone()[0], 5)
        db.execute('INSERT INTO NailWork(id,techId) VALUES (8,1)')
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'FEATURED_CAPACITY_REACHED'):
            db.execute('UPDATE NailWork SET isFeatured=1 WHERE id=8')
        db.execute('UPDATE NailWork SET isFeatured=0 WHERE id IN (1,2)')
        db.execute('UPDATE NailWork SET isFeatured=1 WHERE id=8')
        db.execute('UPDATE NailWork SET isVisible=0 WHERE id=6')
        self.assertIsNone(db.execute('SELECT heroSlot FROM NailWork WHERE id=6').fetchone()[0])


if __name__ == '__main__':
    unittest.main()
