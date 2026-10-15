import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ArtistApplicationsService } from './artist-applications.service';

// A disposable database exercises the actual SQLite insert, not a mocked lock.
describe('artist application SQLite submission', () => {
  let directory: string;
  let db: PrismaClient;
  let secondDb: PrismaClient;
  let service: ArtistApplicationsService;
  let secondService: ArtistApplicationsService;
  const input = { name: '测试', phone: '13800138000', city: '杭州', serviceMode: 'shop' };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'onlynail-application-'));
    const options = { datasources: { db: { url: `file:${join(directory, 'test.db')}` } } };
    db = new PrismaClient(options);
    secondDb = new PrismaClient(options);
    await db.$executeRawUnsafe(`CREATE TABLE "ArtistApplication" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "city" TEXT NOT NULL,
      "serviceMode" TEXT, "experience" TEXT, "specialty" TEXT, "wechat" TEXT, "note" TEXT,
      "followedMp" BOOLEAN NOT NULL DEFAULT false, "status" TEXT NOT NULL DEFAULT 'pending',
      "reviewedBy" INTEGER, "reviewedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
    )`);
    service = new ArtistApplicationsService(db as PrismaService);
    secondService = new ArtistApplicationsService(secondDb as PrismaService);
  });
  beforeEach(async () => { await db.artistApplication.deleteMany(); });
  afterAll(async () => {
    await Promise.all([db?.$disconnect(), secondDb?.$disconnect()]);
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('deduplicates concurrent submissions from separate clients', async () => {
    const results = await Promise.all([service.create(input), secondService.create(input), service.create(input)]);
    expect(results).toEqual([{ received: true }, { received: true }, { received: true }]);
    const rows = await db.artistApplication.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ phone: input.phone, serviceMode: 'shop', followedMp: false });
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });
  it('allows a fresh application after rejection, but not after approval', async () => {
    await service.create(input);
    await db.artistApplication.updateMany({ data: { status: 'rejected' } });
    await secondService.create(input);
    expect(await db.artistApplication.count()).toBe(2);
    await db.artistApplication.updateMany({ where: { status: 'pending' }, data: { status: 'approved' } });
    expect(await service.create(input)).toEqual({ received: true });
    expect(await db.artistApplication.count()).toBe(2);
  });
});
