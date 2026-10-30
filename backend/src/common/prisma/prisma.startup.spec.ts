import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from './prisma.service';

describe('PrismaService SQLite startup', () => {
  it('starts with WAL and a busy timeout using result-returning PRAGMAs', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nailbook-startup-'));
    const previousUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = `file:${path.join(directory, 'startup.db')}`;
    const service = new PrismaService();
    try {
      await service.onModuleInit();
      expect(await service.$queryRawUnsafe('PRAGMA journal_mode')).toEqual([
        { journal_mode: 'wal' },
      ]);
      const rows = await service.$queryRawUnsafe<Array<{ timeout: bigint }>>('PRAGMA busy_timeout');
      expect(Number(rows[0].timeout)).toBe(5000);
      await service.onModuleInit();
    } finally {
      await service.onModuleDestroy();
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
