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
        OR: [
          { visibilityScope: 'public' },
          {
            clientAccesses: {
              some: { clientUserId: 11, canView: true },
            },
          },
        ],
      },
      select: { id: true },
    });
    expect(prisma.clientUser.findUnique).not.toHaveBeenCalled();
  });

  it('按所选有效服务计算合计价格与时长', () => {
    const result = service.resolveSelectedServices(
      JSON.stringify([
        {
          id: 'a',
          name: '基础护理',
          price: 88,
          durationMinutes: 45,
          isActive: true,
          sortOrder: 1,
        },
        {
          id: 'b',
          name: '法式款式',
          price: 168,
          durationMinutes: 75,
          isActive: true,
          sortOrder: 2,
        },
      ]),
      ['a', 'b'],
    );

    expect(result).toEqual({
      names: ['基础护理', '法式款式'],
      totalPrice: 256,
      totalDurationMinutes: 120,
    });
  });
});
