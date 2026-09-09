"""Verify the additive migration against the previous schema and an existing order."""
from pathlib import Path
import os
import sqlite3
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class QuickBookingMigrationTest(unittest.TestCase):
    def test_preserves_existing_order_and_enforces_date_uniqueness(self):
        schema = (ROOT / 'backend/prisma/schema.prisma').read_text()
        previous = '\n'.join(line for line in schema.splitlines()
                             if 'bookingDays ' not in line and 'quickBooking ' not in line)
        previous = previous.split('// Date-level intake policy,')[0]
        with tempfile.TemporaryDirectory(prefix='nailbook-migration-') as directory:
            schema_file = Path(directory) / 'previous.prisma'
            schema_file.write_text(previous)
            env = {**os.environ, 'DATABASE_URL': 'file:' + str(Path(directory) / 'test.db')}
            sql = subprocess.check_output([
                str(ROOT / 'backend/node_modules/.bin/prisma'), 'migrate', 'diff',
                '--from-empty', '--to-schema-datamodel', str(schema_file), '--script',
            ], cwd=directory, env=env, text=True)
            with sqlite3.connect(Path(directory) / 'test.db') as db:
                db.executescript(sql)
                db.execute('PRAGMA foreign_keys = ON')
                db.execute("INSERT INTO Technician(id,name,phone) VALUES(1,'Test','19900000001')")
                db.execute("INSERT INTO Customer(id,technicianId,name) VALUES(1,1,'Test')")
                db.execute("INSERT INTO 'Order'(id,orderNo,technicianId,customerId,startTime,endTime,quotePrice,status) VALUES(1,'EXISTING',1,1,1000,2000,300,'completed')")
                db.executescript((ROOT / 'backend/prisma/migrations/20260830080000_quick_booking_days/migration.sql').read_text())
                self.assertEqual(db.execute("SELECT orderNo,quotePrice,status,quickBooking FROM 'Order'").fetchone(), ('EXISTING', 300, 'completed', 0))
                db.execute("INSERT INTO TechnicianBookingDay(technicianId,serviceDate,accepting,updatedAt) VALUES(1,'2099-01-05',0,1000)")
                with self.assertRaises(sqlite3.IntegrityError):
                    db.execute("INSERT INTO TechnicianBookingDay(technicianId,serviceDate,updatedAt) VALUES(1,'2099-01-05',1000)")
                self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')


if __name__ == '__main__':
    unittest.main()
