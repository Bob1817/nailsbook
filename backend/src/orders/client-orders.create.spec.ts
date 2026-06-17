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
    serviceItems: null,
    ...over,
  });

  beforeEach(() => {
    prisma = {
      clientTechBinding: { findFirst: jest.fn() },
      clientUser: { findUnique: jest.fn() },
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
      '美甲师未开启美甲服务，请联系美甲师开启服务',
    );
  });

  it('选上门但美甲师未开上门 → BadRequest', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({
      technician: tech({ homeService: false }),
    });
    await expect(
      service.create(11, { ...baseDto, serviceType: '上门美甲' }),
    ).rejects.toThrow('该美甲师暂未开启上门美甲服务');
  });

  it('选到店但美甲师未开到店 → BadRequest', async () => {
    prisma.clientTechBinding.findFirst.mockResolvedValue({
      technician: tech({ shopService: false }),
    });
    await expect(
      service.create(11, { ...baseDto, serviceType: '到店美甲' }),
    ).rejects.toThrow('该美甲师暂未开启到店美甲服务');
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
});
