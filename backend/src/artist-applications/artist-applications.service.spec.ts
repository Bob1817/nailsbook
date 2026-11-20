import { ArtistApplicationsService } from './artist-applications.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateArtistApplicationDto } from './dto/create-artist-application.dto';

const input = { name: '测试', phone: '13800138000', city: '杭州', wechat: 'test', serviceMode: 'shop' };
function setup() {
  const tx = {
    artistApplication: {
      update: jest.fn().mockResolvedValue({ id: 1, status: 'approved' }),
    },
    technician: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 2 }),
    },
    clientUser: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: 3 }),
    },
    wechatIdentity: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    artistApplication: { findUnique: jest.fn().mockResolvedValue({ id: 1, ...input }) },
    technician: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    clientUser: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn().mockImplementation(fn => fn(tx)),
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  return { tx, prisma, service: new ArtistApplicationsService(prisma as unknown as PrismaService) };
}

describe('artist application contracts', () => {
  it.each(['home', 'shop', 'both', 'model_artist'])('accepts %s without a follow requirement', async mode => {
    const dto = plainToInstance(CreateArtistApplicationDto, { ...input, serviceMode: mode, name: ' 测试 ' });
    expect(await validate(dto)).toEqual([]);
    expect(dto.name).toBe('测试');
  });
  it.each([{ phone: 'bad' }, { name: '  ' }, { serviceMode: '到店服务' }, { note: 'x'.repeat(1001) }])('rejects invalid payload %o', async change => {
    expect((await validate(plainToInstance(CreateArtistApplicationDto, { ...input, ...change }))).length).toBeGreaterThan(0);
  });
  it('does not disclose review status through legacy phone lookup', async () => {
    const { service } = setup();
    expect(await service.checkPhone(input.phone)).toEqual({ status: 'none' });
  });
  it('returns application progress for valid phone numbers', async () => {
    const { service, prisma } = setup();
    (prisma.artistApplication as any).findFirst = jest.fn().mockResolvedValue({
      status: 'pending',
      name: '测试美甲师',
      city: '上海',
      createdAt: new Date('2026-11-16T10:00:00Z'),
      reviewedAt: null,
    });
    const result = await service.getProgress('13900001111');
    expect(result.status).toBe('pending');
    expect(result.name).toBe('测试美甲师');
    expect(result.city).toBe('上海');

    // Phone not found
    (prisma.artistApplication as any).findFirst = jest.fn().mockResolvedValue(null);
    expect(await service.getProgress('13900002222')).toEqual({ status: 'none' });

    // Invalid phone
    await expect(service.getProgress('123')).rejects.toThrow('请输入正确的11位手机号码');
  });
  it.each([['home', true, false], ['shop', false, true], ['both', true, true], ['到店服务', false, true]])('approves %s with the correct service configuration', async (mode, homeService, shopService) => {
    const { service, tx, prisma } = setup();
    prisma.artistApplication.findUnique.mockResolvedValue({ id: 1, ...input, serviceMode: mode as string });
    await service.approve(1, 9);
    expect(tx.technician.create).toHaveBeenCalledWith({ data: expect.objectContaining({ homeService, shopService }) });
  });
  it('deactivates existing client account when approving applicant with same phone', async () => {
    const { service, tx, prisma } = setup();
    prisma.artistApplication.findUnique.mockResolvedValue({ id: 1, ...input, serviceMode: 'shop' });
    (tx.clientUser.findFirst as jest.Mock).mockResolvedValue({ id: 363, phone: input.phone, nickname: '老客户' });
    await service.approve(1, 9);
    expect(tx.clientUser.update).toHaveBeenCalledWith({
      where: { id: 363 },
      data: expect.objectContaining({
        status: 'deleted',
        phone: `migrated_tech_363_${input.phone}`,
      }),
    });
    expect(tx.technician.create).toHaveBeenCalled();
  });
  it('rejects submission if phone is already a registered client', async () => {
    const { service, prisma } = setup();
    (prisma as any).clientUser = {
      findFirst: jest.fn().mockResolvedValue({ id: 8, phone: input.phone }),
    };
    await expect(service.create(input)).rejects.toThrow('该手机号码已经注册过OnlyNail，无法申请试用');
  });

  it('rejects submission if phone is already a registered technician in guest mode', async () => {
    const { service, prisma } = setup();
    (prisma as any).technician = {
      findFirst: jest.fn().mockResolvedValue({ id: 10, phone: input.phone }),
    };
    await expect(service.create(input)).rejects.toThrow('该手机号码已经注册过OnlyNail，无法申请试用');
  });

  it('allows logged in registered technician to apply for model_artist official campaign', async () => {
    const { service, prisma } = setup();
    (prisma as any).technician = {
      findFirst: jest.fn().mockResolvedValue({ id: 10, phone: input.phone }),
    };
    (prisma.artistApplication as any).findFirst = jest.fn().mockResolvedValue(null);
    const result = await service.create({ ...input, serviceMode: 'model_artist' }, 10);
    expect(result).toEqual({ received: true });
  });

  it('rejects submission if phone already has a pending application', async () => {
    const { service, prisma } = setup();
    (prisma as any).technician = {
      findFirst: jest.fn().mockResolvedValue(null),
    };
    (prisma.artistApplication as any).findFirst = jest.fn().mockResolvedValue({
      id: 5,
      phone: input.phone,
      status: 'pending',
    });
    await expect(service.create(input)).rejects.toThrow('该手机号码已有申请在审核中，请耐心等待，无需重复提交');
  });

  it('rejects submission if phone already has an approved application', async () => {
    const { service, prisma } = setup();
    (prisma as any).technician = {
      findFirst: jest.fn().mockResolvedValue(null),
    };
    (prisma.artistApplication as any).findFirst = jest.fn().mockResolvedValue({
      id: 6,
      phone: input.phone,
      status: 'approved',
    });
    await expect(service.create(input)).rejects.toThrow('该手机号码的试用申请已通过，无需重复申请');
  });

  it('deduplicates applications preserving approved over pending and rejected', async () => {
    const { service, prisma } = setup();
    const rows = [
      { id: 1, phone: '13811112222', status: 'rejected', createdAt: new Date('2026-01-01') },
      { id: 2, phone: '13811112222', status: 'pending', createdAt: new Date('2026-01-02') },
      { id: 3, phone: '13811112222', status: 'approved', createdAt: new Date('2026-01-03') },
      { id: 4, phone: '13988889999', status: 'pending', createdAt: new Date('2026-01-05') },
      { id: 5, phone: '13988889999', status: 'pending', createdAt: new Date('2026-01-06') },
    ];
    (prisma.artistApplication as any).findMany = jest.fn().mockResolvedValue([...rows]);
    (prisma.artistApplication as any).deleteMany = jest.fn().mockResolvedValue({ count: 3 });

    const result = await service.deduplicateApplications();
    expect(result.scannedCount).toBe(5);
    expect(result.duplicatePhoneCount).toBe(2);
    expect(result.deletedCount).toBe(3);

    // 13811112222 should keep id 3 (approved), delete id 2 and 1
    const item1 = result.details.find((d) => d.phone === '13811112222');
    expect(item1?.keptId).toBe(3);
    expect(item1?.keptStatus).toBe('approved');
    expect(item1?.deletedIds.sort()).toEqual([1, 2]);

    // 13988889999 should keep id 5 (newer pending), delete id 4
    const item2 = result.details.find((d) => d.phone === '13988889999');
    expect(item2?.keptId).toBe(5);
    expect(item2?.deletedIds).toEqual([4]);

    expect((prisma.artistApplication as any).deleteMany).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining([1, 2, 4]) } },
    });
  });
});
