import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientOrdersService } from './client-orders.service';

/** 客户下单 create() 的前置校验（绑定就绪门控 / 服务类型 / 内容必填）。 */
describe('ClientOrdersService.create 下单校验', () => {
  let service: any;
  let prisma: any;

  const tech = (over: Record<string, unknown> = {}) => ({
    id: 7,
    status: 'active',
    homeService: true,
    shopService: true,
    serviceItems: JSON.stringify([
      {
        id: 'basic',
        name: '基础美甲',
        price: 128,
        durationMinutes: 90,
        isActive: true,
      },
    ]),
    serviceSchedule: JSON.stringify({
      activeSchemeId: 'regular',
      schemes: [
        { id: 'regular', days: ['wed'], startTime: '09:00', endTime: '18:00' },
      ],
    }),
    shopAddresses: JSON.stringify([
      { id: 'shop-1', detailAddress: '测试路 1 号', enabled: true },
    ]),
    ...over,
  });

  beforeEach(() => {
    prisma = {
      clientTechBinding: { findFirst: jest.fn() },
      clientUser: { findUnique: jest.fn() },
      nailWork: { findFirst: jest.fn() },
    };
    service = new ClientOrdersService(prisma, {} as never, {} as never);
  });

  const baseDto = {
    techId: 7,
    serviceType: '上门美甲',
    serviceDate: '2026-06-10',
    startTime: '10:00',
    chatMode: true, // 跳过内容必填，专注其它守卫
  };

  it('未绑定该美甲师 → NotFound', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue(null);
    await expect(service.create(11, baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('美甲师未开启任何服务类型 → BadRequest（就绪门控）', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({
      technician: tech({ homeService: false, shopService: false }),
    });
    await expect(service.create(11, baseDto)).rejects.toThrow(
      '请至少开启一种服务方式',
    );
  });

  it('选上门但美甲师未开上门 → BadRequest', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({
      technician: tech({ homeService: false }),
    });
    await expect(
      service.create(11, { ...baseDto, serviceType: '上门美甲' }),
    ).rejects.toThrow('尚未开启上门服务');
  });

  it('选到店但美甲师未开到店 → BadRequest', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({
      technician: tech({ shopService: false }),
    });
    await expect(
      service.create(11, { ...baseDto, serviceType: '到店美甲' }),
    ).rejects.toThrow('尚未开启到店服务');
  });

  it('非聊天/非自定义且未选服务内容 → BadRequest（内容必填）', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({
      technician: tech(),
    });
    await expect(
      service.create(11, {
        ...baseDto,
        chatMode: false,
        selectedServiceIds: [],
      }),
    ).rejects.toThrow('请选择至少一项服务内容或填写自定义需求');
  });

  it('过校验但客户不存在 → NotFound', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({
      technician: tech(),
    });
    prisma.clientUser.findUnique.mockResolvedValue(null);
    await expect(service.create(11, baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('分享预约提交时校验原作品令牌，不回退到公开或永久授权', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({ technician: tech() });
    prisma.nailWork.findFirst.mockResolvedValue(null);
    const token = 'a'.repeat(48);
    await expect(service.create(11, {
      ...baseDto, sourceWorkId: 88, sourceShareToken: token,
    })).rejects.toThrow('来源作品不存在或查看授权已失效');
    const where = prisma.nailWork.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({
      id: 88, techId: 7, isVisible: true, archivedAt: null,
      publicationStatus: 'approved',
      shareGrants: { some: {
        token, revokedAt: null, expiresAt: { gt: expect.any(Date) },
        access: { canView: true, canShare: true },
      } },
    });
    expect(where.OR).toBeUndefined();
    expect(prisma.clientUser.findUnique).not.toHaveBeenCalled();
  });

  it('预约同款在提交时重新校验来源作品归属与查看权', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({
      technician: tech(),
    });
    prisma.nailWork.findFirst.mockResolvedValue(null);

    await expect(
      service.create(11, { ...baseDto, sourceWorkId: 88 }),
    ).rejects.toThrow('来源作品不存在或查看授权已失效');
    expect(prisma.nailWork.findFirst).toHaveBeenCalledWith({
      where: {
        id: 88,
        techId: 7,
        isVisible: true,
        archivedAt: null,
        OR: [
          { visibilityScope: 'public' },
          {
            clientAccesses: {
              some: { clientUserId: 11, canView: true },
            },
          },
        ],
      },
      include: {
        serviceLines: { orderBy: { sortOrder: 'asc' } },
        promotion: true,
      },
    });
    expect(prisma.clientUser.findUnique).not.toHaveBeenCalled();
  });
});
