import { ClientAuthService } from '../client-auth/client-auth.service';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TechnicianAuthService } from '../technician-auth/technician-auth.service';
import { TechnicianServicesService } from '../technician-services/technician-services.service';
import { BrandProfilesService } from '../brand-profiles/brand-profiles.service';

describe('美甲师接单准备数据库集成', () => {
  let prisma: PrismaClient, directory: string, auth: TechnicianAuthService;
  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'nailbook-setup-'));
    const db = join(directory, 'test.db');
    const sql = execFileSync('npx', ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script']);
    execFileSync('sqlite3', [db], { input: sql });
    prisma = new PrismaClient({ datasources: { db: { url: `file:${db}` } } });
    auth = new TechnicianAuthService(prisma as any, {} as any, {} as any, {} as any);
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  it.each(['new', 'existing', 'prebound'])('客户激活美甲师（%s）后默认暂停接单', async (mode) => {
    const phone = `setup-activation-${mode}`;
    const client = await prisma.clientUser.create({ data: { phone, passwordHash: 'fixture-hash' } });
    const existing = mode === 'new' ? null : await prisma.technician.create({ data: { phone, name: '待激活美甲师', status: 'active' } });
    const key = await prisma.technicianInviteKey.create({ data: { key: `setup-key-${mode}`, usedByTechnicianId: mode === 'prebound' ? existing!.id : undefined } });
    const clients = new ClientAuthService(prisma as any, { sign: () => 'fixture-token' } as any, {} as any, {} as any, {} as any, {} as any);
    const result = await clients.activateTechnician(client.id, key.key);
    expect(result.technician.status).toBe('inactive');
    expect((await auth.getProfile(result.technician.id)).bookingSetup.accepting).toBe(false);
  });

  it('必要三项完成即可主动接单，可选资料不阻断，删除必要资料重新拦截', async () => {
    const { id } = await prisma.technician.create({ data: { name: '验收美甲师', phone: 'setup-fixture', homeService: false, shopService: false } });
    const progress = async (completed: number, accepting = false, requiredCompleted = Math.min(completed, 3)) => {
      const profile = await auth.getProfile(id);
      expect(profile.bookingSetup).toMatchObject({ completed, total: 5, requiredCompleted, requiredTotal: 3, ready: requiredCompleted === 3, accepting });
      expect(profile.bookingReady).toBe(accepting);
    };
    await progress(0);
    await expect(auth.updateStatus(id, 'active')).rejects.toThrow();
    await auth.updateServiceType(id, { shopService: true, shopAddresses: [{ name: '测试门店', detailAddress: '测试地址 101 号', enabled: true }] });
    await progress(1);
    await new TechnicianServicesService(prisma as any).create(id, { name: '基础护理', category: 'basic_care', price: 99, durationMinutes: 60 });
    await progress(2);
    await auth.updateProfile(id, { serviceSchedule: { activeSchemeId: 'work', schemes: [{ id: 'work', days: ['mon', 'tue'], startTime: '10:00', endTime: '18:00' }] } });
    await progress(3);
    await auth.updateStatus(id, 'active');
    await progress(3, true);
    await auth.updateProfile(id, { avatarUrl: '/uploads/avatar.jpg', bio: '个人介绍' });
    await new BrandProfilesService(prisma as any).update(id, {
      brandName: '验收工作室', tagline: '专注手绘', heroImageUrl: '/uploads/hero.jpg',
      city: '上海', publicServiceArea: '静安', artistIntroduction: '个人介绍',
      hygieneStandards: '每位客户独立消毒', cancellationPolicy: '提前一天联系改期',
      shareTitle: '验收工作室', shareCoverUrl: '/uploads/hero.jpg', publicationStatus: 'published',
      environmentPhotos: [{ imageUrl: '/uploads/environment.jpg' }],
    });
    await progress(4, true);
    const work = await prisma.nailWork.create({ data: { techId: id, title: '代表作品', coverUrl: '/uploads/work.jpg', isVisible: true, visibilityScope: 'public', publicationStatus: 'pending' } });
    await progress(4, true);
    await prisma.nailWork.update({ where: { id: work.id }, data: { publicationStatus: 'approved' } });
    await progress(5, true);
    for (const data of [{ visibilityScope: 'private' }, { visibilityScope: 'public', coverUrl: '' }, { coverUrl: null }, { coverUrl: '/uploads/work.jpg', archivedAt: new Date() }]) {
      await prisma.nailWork.update({ where: { id: work.id }, data });
      await progress(4, true);
      await auth.updateStatus(id, 'active');
    }
    await prisma.nailWork.update({ where: { id: work.id }, data: { archivedAt: null } });
    await progress(5, true);
    await auth.updateStatus(id, 'inactive');
    await progress(5);
    await auth.updateProfile(id, { serviceSchedule: { activeSchemeId: '', schemes: [] } });
    await progress(4, false, 2);
    await expect(auth.updateStatus(id, 'active')).rejects.toThrow('工作时间');
    expect((await auth.getProfile(id)).bio).toBe('个人介绍');
  });
});
