import { BadRequestException } from '@nestjs/common';
import { TechnicianWorksService } from './technician-works.service';

describe('作品分享优惠', () => {
  function setup() {
    const prisma = {
      nailWork: { findFirst: jest.fn() },
      workPromotion: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    const service = new TechnicianWorksService(
      prisma as never,
      { assertCanCreateWork: jest.fn() } as never,
      { deleteImageVariants: jest.fn() } as never,
    );
    return { prisma, service };
  }

  it('只允许作品所属美甲师保存优惠，并保留有效期', async () => {
    const { prisma, service } = setup();
    prisma.nailWork.findFirst.mockResolvedValue({ id: 8, standardPriceFen: 59800 });
    prisma.workPromotion.upsert.mockResolvedValue({
      id: 3,
      title: '分享专享',
      discountAmountFen: 3000,
      enabled: true,
      startsAt: null,
      endsAt: new Date('2026-09-30T15:59:59.000Z'),
    });

    const result = await service.savePromotion(7, 8, {
      title: '分享专享',
      discountAmountFen: 3000,
      enabled: true,
      endsAt: '2026-09-30T23:59:59+08:00',
    });

    expect(prisma.workPromotion.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { workId: 8 },
      create: expect.objectContaining({ technicianId: 7, discountAmountFen: 3000, enabled: true }),
    }));
    expect(result).toMatchObject({ discountAmount: 30, enabled: true });
  });

  it('开启优惠时拒绝空优惠或超过作品报价', async () => {
    const { prisma, service } = setup();
    prisma.nailWork.findFirst.mockResolvedValue({ id: 8, standardPriceFen: 59800 });
    await expect(service.savePromotion(7, 8, {
      discountAmountFen: 0,
      enabled: true,
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.savePromotion(7, 8, {
      discountAmountFen: 59801,
      enabled: false,
    })).rejects.toThrow('不能超过作品综合报价');
  });
});
