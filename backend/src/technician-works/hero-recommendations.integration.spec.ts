import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TechnicianWorksService } from './technician-works.service';
import { ClientHomeService } from '../client-home/client-home.service';

describe('Hero 与绑定名额（真实隔离 SQLite）', () => {
  let directory: string, prisma: PrismaService, works: TechnicianWorksService, home: ClientHomeService;
  let serial = 0;
  const originalUrl = process.env.DATABASE_URL;
  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nailbook-hero-test-'));
    writeFileSync(join(directory, 'test.db'), '');
    process.env.DATABASE_URL = `file:${join(directory, 'test.db')}`;
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
    prisma = new PrismaService(); await prisma.$connect();
    works = new TechnicianWorksService(prisma, {} as never, {} as never);
    home = new ClientHomeService(prisma);
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
    if (directory) rmSync(directory, { recursive: true, force: true });
  });
  const tech = () => prisma.technician.create({ data: { name: '测试美甲师', phone: `tech-${++serial}`, status: 'active' } });
  const client = () => prisma.clientUser.create({ data: { phone: `client-${++serial}` } });
  const work = (techId: number) => prisma.nailWork.create({ data: { techId, title: '测试作品', coverUrl: '/test.jpg', publicationStatus: 'approved', isVisible: true, visibilityScope: 'public' } });
  const bind = (clientId: number, techId: number, status = 'active', isDefault = false) => prisma.clientTechBinding.create({ data: { clientId, techId, status, isDefault, bindSource: 'test' } });

  it('3个独立推荐位；替换、重排、过期编辑保护与失败回滚', async () => {
    const artist = await tech();
    const items = await Promise.all(Array.from({ length: 4 }, () => work(artist.id)));
    await prisma.nailWork.update({ where: { id: items[0].id }, data: { isFeatured: true } });
    const ids = items.slice(0, 3).map(w => w.id);
    await works.saveHeroRecommendations(artist.id, { workIds: ids, expectedWorkIds: [] });
    await expect(works.saveHeroRecommendations(artist.id, { workIds: items.map(w => w.id), expectedWorkIds: ids })).rejects.toThrow('最多推荐 3');
    const replacement = [items[3].id, ids[1], ids[2]];
    await works.saveHeroRecommendations(artist.id, { workIds: replacement, expectedWorkIds: ids });
    expect((await prisma.nailWork.findUniqueOrThrow({ where: { id: ids[0] } })).isFeatured).toBe(true);
    await expect(works.saveHeroRecommendations(artist.id, { workIds: [ids[0]], expectedWorkIds: ids })).rejects.toThrow('已变更');
    await works.saveHeroRecommendations(artist.id, { workIds: replacement.slice().reverse(), expectedWorkIds: replacement });
    const foreign = await work((await tech()).id);
    await expect(works.saveHeroRecommendations(artist.id, { workIds: [foreign.id], expectedWorkIds: replacement.slice().reverse() })).rejects.toThrow('本人');
    // A blank cover passes the count query but fails the database constraint after slots clear.
    await prisma.nailWork.update({ where: { id: items[0].id }, data: { coverUrl: ' ' } });
    await expect(works.saveHeroRecommendations(artist.id, { workIds: [items[0].id], expectedWorkIds: replacement.slice().reverse() })).rejects.toThrow();
    expect((await works.getHeroRecommendations(artist.id)).works.map(w => w.id)).toEqual(replacement.slice().reverse());
  });

  it.each([{ isVisible: false }, { visibilityScope: 'authorized_clients' }, { publicationStatus: 'pending' }, { archivedAt: new Date() }, { coverUrl: '' }])('失去资格自动腾出推荐位：%j', async data => {
    const artist = await tech(), item = await work(artist.id);
    await works.saveHeroRecommendations(artist.id, { workIds: [item.id], expectedWorkIds: [] });
    await prisma.nailWork.update({ where: { id: item.id }, data });
    expect((await works.getHeroRecommendations(artist.id)).works).toEqual([]);
  });

  it.each([[1, [0,0,0]], [2, [0,1,0,1,0]], [3, [0,1,2,0,1]], [4, [0,1,2,3,0]], [5, [0,1,2,3,4]]] as [number, number[]][])('%i位美甲师逐人轮流分配', async (count, expected) => {
    const customer = await client(), artists: number[] = [];
    for (let i = 0; i < count; i++) {
      const artist = await tech(); artists.push(artist.id);
      const binding = await bind(customer.id, artist.id, 'active', i === 0);
      await prisma.clientTechBinding.update({ where: { id: binding.id }, data: { createdAt: new Date(2026, 0, count - i) } });
      const ids: number[] = [];
      for (let slot = 0; slot < 3; slot++) ids.push((await work(artist.id)).id);
      await works.saveHeroRecommendations(artist.id, { workIds: ids, expectedWorkIds: [] });
    }
    const result = await home.getHome(customer.id);
    expect(result.works.map(w => artists.indexOf(w.technicianId!))).toEqual(expected);
    expect(new Set(result.works.map(w => w.id)).size).toBe(result.works.length);
  });

  it('未绑定、待审批和禁用账号不参与推荐', async () => {
    const customer = await client();
    expect((await home.getHome(customer.id)).works).toEqual([]);
    const artist = await tech(), item = await work(artist.id);
    await works.saveHeroRecommendations(artist.id, { workIds: [item.id], expectedWorkIds: [] });
    const binding = await bind(customer.id, artist.id, 'pending');
    expect((await home.getHome(customer.id)).works).toEqual([]);
    await prisma.clientTechBinding.update({ where: { id: binding.id }, data: { status: 'active' } });
    expect((await home.getHome(customer.id)).works).toHaveLength(1);
    await prisma.technician.update({ where: { id: artist.id }, data: { status: 'inactive' } });
    expect((await home.getHome(customer.id)).works).toEqual([]);
  });

  it('并发抢最后名额不超5且错误可读；审批不重复占位，解除后可新增', async () => {
    const customer = await client();
    for (let i = 0; i < 4; i++) await bind(customer.id, (await tech()).id);
    const artists = await Promise.all([tech(), tech()]);
    const results = await Promise.allSettled(artists.map(t => bind(customer.id, t.id, 'pending')));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(BadRequestException);
    expect(rejected.reason.message).toContain('最多绑定 5');
    const winner = (results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<{ id: number }>).value;
    await prisma.clientTechBinding.update({ where: { id: winner.id }, data: { status: 'active' } });
    await prisma.clientTechBinding.update({ where: { id: winner.id }, data: { status: 'inactive' } });
    await bind(customer.id, (await tech()).id, 'pending');
    await expect(prisma.clientTechBinding.update({ where: { id: winner.id }, data: { status: 'pending' } })).rejects.toThrow('最多绑定 5');
  });

  it('事务内的分享/注册绑定同样受限，失败回滚整笔写入', async () => {
    const customer = await client();
    for (let i = 0; i < 5; i++) await bind(customer.id, (await tech()).id);
    const artist = await tech();
    await expect(prisma.$transaction(async tx => {
      await tx.clientUser.update({ where: { id: customer.id }, data: { nickname: '不应保存' } });
      await tx.clientTechBinding.create({ data: { clientId: customer.id, techId: artist.id, bindSource: 'work_share', status: 'active' } });
    })).rejects.toThrow('最多绑定 5');
    expect((await prisma.clientUser.findUniqueOrThrow({ where: { id: customer.id } })).nickname).not.toBe('不应保存');
  });

  it('同时替换同一推荐列表不会产生混合结果或超过三个推荐位', async () => {
    const artist = await tech();
    const items = await Promise.all(Array.from({ length: 5 }, () => work(artist.id)));
    const initial = items.slice(0,3).map(w => w.id);
    await works.saveHeroRecommendations(artist.id, { workIds: initial, expectedWorkIds: [] });
    const a = [items[3].id, initial[1], initial[2]], b = [initial[0], items[4].id, initial[2]];
    const results = await Promise.allSettled([a,b].map(workIds => works.saveHeroRecommendations(artist.id, { workIds, expectedWorkIds: initial })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect([a,b]).toContainEqual((await works.getHeroRecommendations(artist.id)).works.map(w => w.id));
  });

  it('个人精选后端6个上限，与Hero独立', async () => {
    const artist = await tech();
    for (let i = 0; i < 6; i++) await works.toggleFeatured(artist.id, (await work(artist.id)).id);
    const seventh = await work(artist.id);
    await expect(works.toggleFeatured(artist.id, seventh.id)).rejects.toThrow('最多精选 6');
    await works.saveHeroRecommendations(artist.id, { workIds: [seventh.id], expectedWorkIds: [] });
    expect((await works.getHeroRecommendations(artist.id)).works).toHaveLength(1);
  });
});
