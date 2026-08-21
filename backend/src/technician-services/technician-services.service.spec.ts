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
});
