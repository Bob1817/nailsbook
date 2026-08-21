import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientOrdersService } from './client-orders.service';

describe('ClientOrdersService 状态守卫（客户端）', () => {
  let service: any;
  let prisma: any;

  beforeEach(() => {
    prisma = { order: { findFirst: jest.fn() } };
    service = new ClientOrdersService(prisma, {} as never, {} as never);
  });

  it('agree：订单不存在 → NotFound', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(service.agree(11, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('agree：待报价同意/待客户确认 以外的状态 → BadRequest', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 1, status: 'pending_home' });
    await expect(service.agree(11, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejectQuote：非待报价同意(pending_agree) → BadRequest', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 1,
      status: 'pending_confirm',
    });
    await expect(service.rejectQuote(11, 1, '太贵了')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
