import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { TechniciansService } from './technicians.service';

describe('TechniciansService', () => {
  let service: TechniciansService;
  let prisma: {
    technician: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      technician: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new TechniciansService(prisma as never);
  });

  it('creates technicians with a generated invitation code', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce(null);
    prisma.technician.create.mockImplementationOnce(({ data }) => ({
      id: 7,
      ...data,
    }));

    const result = await service.create({
      name: 'Anna',
      phone: '+8613800000000',
      city: 'Shanghai',
      serviceArea: 'Pudong',
    });

    // 超管直建账号：初始默认密码 123456，首次登录强制改密
    expect(prisma.technician.create).toHaveBeenCalledWith({
      data: {
        name: 'Anna',
        phone: '+8613800000000',
        city: 'Shanghai',
        serviceArea: 'Pudong',
        invitationCode: expect.stringMatching(/^[A-F0-9]{8}$/),
        status: 'active',
        passwordHash: expect.any(String),
        mustChangePassword: true,
      },
    });
    expect(result.invitationCode).toMatch(/^[A-F0-9]{8}$/);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.passwordConfigured).toBe(true);
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

  it('resets an active technician to a random password and invalidates tokens', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce({
      id: 7,
      status: 'active',
    });
    prisma.technician.update.mockResolvedValueOnce({ id: 7 });

    const result = await service.resetPassword(7);

    expect(result.tempPassword).toMatch(/^[A-Za-z2-9]{12}$/);
    const update = prisma.technician.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 7 });
    expect(update.data.tokenVersion).toEqual({ increment: 1 });
    expect(update.data.mustChangePassword).toBe(true);
    await expect(
      bcrypt.compare(result.tempPassword, update.data.passwordHash),
    ).resolves.toBe(true);
  });

  it('does not reset a deleted technician account', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce({
      id: 7,
      status: 'deleted',
    });

    await expect(service.resetPassword(7)).rejects.toThrow(
      new BadRequestException('该账号已删除，无法重置密码'),
    );
    expect(prisma.technician.update).not.toHaveBeenCalled();
  });
});
