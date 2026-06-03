import { BadRequestException } from '@nestjs/common';
import { TechnicianAuthService } from './technician-auth.service';

describe('TechnicianAuthService.setInitialPassword', () => {
  let service: TechnicianAuthService;
  let prisma: {
    technician: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock };

  const baseTechnician = {
    id: 7,
    name: 'Anna',
    phone: '13800138000',
    avatarUrl: null,
    city: null,
    serviceArea: null,
    status: 'active',
    invitationCode: 'ABCD2345',
    homeService: null,
    shopService: null,
    shopAddresses: null,
    socialMedia: null,
    serviceItems: null,
    subscription: null,
    tokenVersion: 0,
    passwordHash: '',
  };

  beforeEach(() => {
    prisma = {
      technician: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    service = new TechnicianAuthService(
      prisma as never,
      jwtService as never,
      {} as never,
      {} as never,
    );
  });

  it('sets the password and issues tokens when the account has no password', async () => {
    prisma.technician.findUnique.mockResolvedValue({ ...baseTechnician });

    const result = await service.setInitialPassword('13800138000', 'abcd1234');

    // 写入了密码且清除 mustChangePassword
    expect(prisma.technician.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({
          mustChangePassword: false,
          tokenVersion: { increment: 1 },
        }),
      }),
    );
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.technician.id).toBe(7);
  });

  it('rejects when the account already has a password', async () => {
    prisma.technician.findUnique.mockResolvedValue({
      ...baseTechnician,
      passwordHash: '$2b$10$alreadysethashvalue',
    });

    await expect(
      service.setInitialPassword('13800138000', 'abcd1234'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.technician.update).not.toHaveBeenCalled();
  });

  it('rejects when the phone is not registered', async () => {
    prisma.technician.findUnique.mockResolvedValue(null);

    await expect(
      service.setInitialPassword('13800138000', 'abcd1234'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
