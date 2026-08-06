import { BadRequestException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService archive', () => {
  const prisma: any = {
    customer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: CustomersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomersService(prisma);
    prisma.customer.findUnique.mockResolvedValue({ technicianId: 7 });
    prisma.customer.update.mockResolvedValue({
      id: 3,
      technicianId: 7,
      archivedAt: new Date(),
    });
  });

  it('允许归档最近十二个月无互动的客户', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);

    await expect(service.archiveCustomer(3, 7)).resolves.toMatchObject({
      id: 3,
      technicianId: 7,
    });
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { archivedAt: expect.any(Date) },
    });
  });

  it('拒绝归档最近十二个月仍有互动的客户', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 3 });

    await expect(service.archiveCustomer(3, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });
});
