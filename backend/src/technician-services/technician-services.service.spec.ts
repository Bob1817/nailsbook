import { TechnicianServicesService } from './technician-services.service';

describe('TechnicianServicesService', () => {
  const prisma = {
    technician: {
      findUnique: jest.fn(),
      update: jest.fn(),
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

    const result = await service.create(7, {
      name: '法式美甲',
      category: 'color_style',
      price: 268,
      durationMinutes: 120,
    });

    expect(result).toMatchObject({ price: 268, durationMinutes: 120 });
    const saved = JSON.parse(
      prisma.technician.update.mock.calls[0][0].data.serviceItems,
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
