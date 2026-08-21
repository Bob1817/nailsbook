import { CustomersService } from './customers.service';

describe('P1-01 customer profile upgrade', () => {
  it('requires a reason and records manual lifecycle changes', async () => {
    const tx: any = {
      customerLifecycleHistory: { create: jest.fn() },
      customer: { update: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    const prisma: any = {
      customer: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 1, lifecycleStage: 'active' }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const service = new CustomersService(prisma);
    await expect(service.updateLifecycle(1, 7, 'dormant', '')).rejects.toThrow(
      '必须填写原因',
    );
    await service.updateLifecycle(1, 7, 'dormant', '客户主动暂停');
    expect(tx.customerLifecycleHistory.create).toHaveBeenCalledWith({
      data: {
        customerId: 1,
        technicianId: 7,
        fromStage: 'active',
        toStage: 'dormant',
        reason: '客户主动暂停',
      },
    });
  });

  it('merges business relations and totals in one transaction', async () => {
    const model = () => ({ updateMany: jest.fn() });
    const tx: any = {
      order: model(),
      revenue: model(),
      serviceRecord: model(),
      lead: model(),
      nailWorkClientAccess: model(),
      publicationConsent: model(),
      customer: { update: jest.fn(), delete: jest.fn() },
    };
    const prisma: any = {
      customer: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 1,
            clientUserId: null,
            completedServiceCount: 2,
            lifetimePaidAmount: 300,
            lastServiceAt: new Date('2026-08-01'),
          })
          .mockResolvedValueOnce({
            id: 2,
            clientUserId: 8,
            completedServiceCount: 1,
            lifetimePaidAmount: 200,
            lastServiceAt: new Date('2026-08-10'),
          }),
      },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    await new CustomersService(prisma).mergeCustomers(7, 1, 2);
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { customerId: 2 },
      data: { customerId: 1 },
    });
    expect(tx.customer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        completedServiceCount: { increment: 1 },
        lifetimePaidAmount: { increment: 200 },
        clientUserId: 8,
      }),
    });
    expect(tx.customer.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it('anonymizes identity while preserving the customer record', async () => {
    const prisma: any = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };
    await new CustomersService(prisma).anonymizeCustomer(1, 7);
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        phone: null,
        address: null,
        clientUserId: null,
        anonymizedAt: expect.any(Date),
        archivedAt: expect.any(Date),
      }),
    });
  });
});
