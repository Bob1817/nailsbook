import { ConflictException } from '@nestjs/common';
import { TechniciansService } from './technicians.service';

describe('TechniciansService', () => {
  let service: TechniciansService;
  let prisma: {
    technician: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      technician: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new TechniciansService(prisma as never);
  });

  it('creates technicians with a generated invitation code', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce(null);
    prisma.technician.create.mockImplementationOnce(async ({ data }) => ({
      id: 7,
      ...data,
    }));

    const result = await service.create({
      name: 'Anna',
      phone: '+8613800000000',
      city: 'Shanghai',
      serviceArea: 'Pudong',
    });

    expect(prisma.technician.create).toHaveBeenCalledWith({
      data: {
        name: 'Anna',
        phone: '+8613800000000',
        city: 'Shanghai',
        serviceArea: 'Pudong',
        invitationCode: expect.stringMatching(/^[A-F0-9]{8}$/),
        status: 'active',
      },
    });
    expect(result.invitationCode).toMatch(/^[A-F0-9]{8}$/);
  });

  it('rejects duplicate technician phone numbers', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce({
      id: 7,
      phone: '+8613800000000',
    });

    await expect(
      service.create({
        name: 'Anna',
        phone: '+8613800000000',
      }),
    ).rejects.toThrow(
      new ConflictException('Technician with this phone number already exists'),
    );
  });
});
