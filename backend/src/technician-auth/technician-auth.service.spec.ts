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
  let verificationCode: { validate: jest.Mock };

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
    verificationCode = { validate: jest.fn() };
    service = new TechnicianAuthService(
      prisma as never,
      jwtService as never,
      verificationCode as never,
      {} as never,
    );
  });

  it('sets the password and issues tokens when the account has no password', async () => {
    prisma.technician.findUnique.mockResolvedValue({ ...baseTechnician });

    const result = await service.setInitialPassword(
      '13800138000',
      '123456',
      'abcd1234',
    );

    expect(verificationCode.validate).toHaveBeenCalledWith(
      '13800138000',
      '123456',
      'technician:initial-password',
    );

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
      service.setInitialPassword('13800138000', '123456', 'abcd1234'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.technician.update).not.toHaveBeenCalled();
  });

  it('rejects when the phone is not registered', async () => {
    prisma.technician.findUnique.mockResolvedValue(null);

    await expect(
      service.setInitialPassword('13800138000', '123456', 'abcd1234'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forces shop-only service settings in mini program launch mode', async () => {
    const previousLaunchMode = process.env.MINIPROGRAM_LAUNCH_MODE;
    process.env.MINIPROGRAM_LAUNCH_MODE = 'true';
    prisma.technician.findUnique.mockResolvedValue({ ...baseTechnician });
    prisma.technician.update.mockResolvedValue({
      ...baseTechnician,
      homeService: false,
      shopService: true,
    });

    try {
      await service.updateServiceType(7, {
        homeService: true,
        shopService: false,
      });
    } finally {
      if (previousLaunchMode === undefined) {
        delete process.env.MINIPROGRAM_LAUNCH_MODE;
      } else {
        process.env.MINIPROGRAM_LAUNCH_MODE = previousLaunchMode;
      }
    }

    expect(prisma.technician.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: {
          homeService: false,
          shopService: true,
        },
      }),
    );
  });

  it('rejects enabling orders before service pricing is complete', async () => {
    prisma.technician.findUnique.mockResolvedValue({
      ...baseTechnician,
      status: 'inactive',
      shopService: true,
      shopAddresses: JSON.stringify([
        { detailAddress: '测试路1号', enabled: true },
      ]),
      serviceSchedule: JSON.stringify({
        activeSchemeId: 'regular',
        schemes: [
          {
            id: 'regular',
            days: ['mon'],
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      }),
    });

    await expect(service.updateStatus(7, 'active')).rejects.toThrow(
      '请配置启用中的服务项目、价格和时长',
    );
    expect(prisma.technician.update).not.toHaveBeenCalled();
  });
});
