import { BadRequestException, ConflictException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma: any = {
    paymentOrder: {
      findUnique: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    order: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = { get: jest.fn() };
  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(prisma, config as any);
    prisma.paymentOrder.findUnique.mockResolvedValue(null);
    prisma.order.findFirst.mockResolvedValue({
      id: 10,
      technicianId: 3,
      status: 'pending_confirm',
      quotePrice: 200,
      fundDiscountAmount: 20,
      depositAmount: 50,
    });
    prisma.paymentOrder.aggregate.mockResolvedValue({ _sum: { amountCents: null } });
  });

  it('创建定金支付单并以分保存金额', async () => {
    config.get.mockReturnValue('mock');
    prisma.paymentOrder.create.mockImplementation(({ data }: any) => ({
      id: 1,
      createdAt: new Date(),
      paidAt: null,
      ...data,
    }));

    const result = await service.createOrderPayment(8, 10, 'deposit', 'deposit-10-v1');

    expect(prisma.paymentOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amountCents: 5000, status: 'pending' }),
    });
    expect(result.amount).toBe(50);
  });

  it('商户资质未就绪时创建可追踪支付单但不标记成功', async () => {
    config.get.mockReturnValue(undefined);
    prisma.paymentOrder.create.mockImplementation(({ data }: any) => ({
      id: 1,
      createdAt: new Date(),
      paidAt: null,
      ...data,
    }));

    const result = await service.createOrderPayment(8, 10, 'deposit', 'deposit-10-v2');

    expect(result.status).toBe('channel_pending');
    expect(result.channelReady).toBe(false);
    expect(result.unavailableReason).toContain('营业执照');
  });

  it('相同幂等键返回原支付单，跨业务复用则拒绝', async () => {
    prisma.paymentOrder.findUnique.mockResolvedValue({
      id: 1,
      paymentNo: 'PAY1',
      clientUserId: 8,
      orderId: 10,
      amountCents: 5000,
      paymentType: 'deposit',
      channel: 'wechat',
      status: 'pending',
      providerPayload: null,
    });
    await expect(service.createOrderPayment(8, 10, 'deposit', 'same')).resolves.toMatchObject({ id: 1 });
    await expect(service.createOrderPayment(9, 10, 'deposit', 'same')).rejects.toBeInstanceOf(ConflictException);
  });

  it('服务未开始时拒绝创建尾款支付单', async () => {
    await expect(service.createOrderPayment(8, 10, 'final', 'final-10')).rejects.toBeInstanceOf(BadRequestException);
  });
});
