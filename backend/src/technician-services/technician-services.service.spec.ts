import { TechnicianServicesService } from './technician-services.service';

describe('TechnicianServicesService', () => {
  const prisma = {
    technician: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    service: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  let service: TechnicianServicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TechnicianServicesService(prisma as never);
  });

  it('persists service price and duration when creating an item', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce({
      id: 7,
      serviceItems: '[]',
    });
    prisma.technician.update.mockResolvedValue({});
    prisma.service.count.mockResolvedValue(0);
    prisma.service.create.mockResolvedValue({});
    prisma.service.findMany.mockResolvedValue([
      {
        id: 1,
        publicId: 'svc-test',
        name: '法式美甲',
        description: null,
        category: 'color_style',
        priceMinFen: 26800,
        durationMinutes: 120,
        isBookable: true,
        sortOrder: 1,
        createdAt: new Date('2026-08-21T00:00:00Z'),
        updatedAt: new Date('2026-08-21T00:00:00Z'),
      },
    ]);

    const result = await service.create(7, {
      name: '法式美甲',
      category: 'color_style',
      price: 268,
      durationMinutes: 120,
    });

    expect(prisma.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: '法式美甲',
          priceMinFen: 26800,
          durationMinutes: 120,
        }),
      }),
    );
    const saved = JSON.parse(
      prisma.technician.update.mock.calls.at(-1)[0].data.serviceItems,
    );
    expect(saved[0]).toMatchObject({ price: 268, durationMinutes: 120 });
  });

  it('rejects creating a service without a valid price and duration', async () => {
    prisma.technician.findUnique.mockResolvedValue({
      id: 7,
      serviceItems: '[]',
    });

    await expect(
      service.create(7, {
        name: '法式美甲',
        category: 'color_style',
        price: Number.NaN,
        durationMinutes: 10,
      }),
    ).rejects.toThrow('请输入有效服务价格');
    expect(prisma.technician.update).not.toHaveBeenCalled();
  });

  it('accepts a zero-duration surcharge and rejects an unknown category', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce({ id: 7, serviceItems: '[]' });
    prisma.technician.update.mockResolvedValue({});
    prisma.service.count.mockResolvedValue(0);
    prisma.service.create.mockResolvedValue({});
    prisma.service.findMany.mockResolvedValue([{ id: 2, publicId: 'night', name: '晚间服务费', description: null, category: 'surcharge_night', priceMinFen: 3000, durationMinutes: 0, isBookable: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() }]);

    await service.create(7, { name: '晚间服务费', category: 'surcharge_night', price: 30, durationMinutes: 0 });
    expect(prisma.service.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ category: 'surcharge_night', durationMinutes: 0 }) }));

    await expect(service.create(7, { name: '未知项目', category: 'unknown' as never, price: 10, durationMinutes: 30 })).rejects.toThrow('服务分类无效');
  });

  it('validates and stores the default deposit rule', async () => {
    prisma.technician.update.mockResolvedValue({ depositMode: 'percentage', depositValue: 2000 });

    await expect(service.updatePricingSettings(7, { depositMode: 'percentage', depositValue: 10001 })).rejects.toThrow('定金设置无效');
    await expect(service.updatePricingSettings(7, { depositMode: 'other', depositValue: 0 })).rejects.toThrow('定金设置无效');
    await service.updatePricingSettings(7, { depositMode: 'percentage', depositValue: 2000 });
    expect(prisma.technician.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { depositMode: 'percentage', depositValue: 2000 } }));
  });
});
