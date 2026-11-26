import { BadRequestException } from '@nestjs/common';
import { TechnicianAuthService } from './technician-auth.service';

describe('TechnicianAuthService QR login', () => {
  let service: TechnicianAuthService;
  let prisma: {
    clientUser: { findFirst: jest.Mock };
    technician: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };
  let jwtService: { sign: jest.Mock };

  const baseTechnician = {
    id: 7,
    name: 'Anna',
    phone: '13800138000',
    avatarUrl: null,
    bio: null,
    city: null,
    province: null,
    serviceArea: null,
    status: 'active',
    invitationCode: 'ABCD2345',
    homeService: null,
    homeServiceSettings: null,
    shopService: null,
    shopAddresses: null,
    socialMedia: null,
    serviceItems: null,
    subscription: null,
    tokenVersion: 0,
    passwordHash: 'hash',
  };

  beforeEach(() => {
    prisma = {
      clientUser: { findFirst: jest.fn().mockResolvedValue(null) },
      technician: {
        findUnique: jest.fn().mockResolvedValue({ ...baseTechnician }),
        findFirst: jest.fn().mockResolvedValue({ ...baseTechnician }),
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

  it('creates a QR session and completes scan -> confirm -> one-time token issuance', async () => {
    const created = await service.createQrSession();
    expect(created.sceneToken).toHaveLength(32);
    expect(created.available).toBe(false);

    expect(await service.getQrSessionStatus(created.sceneToken)).toEqual({
      status: 'pending',
    });

    await service.confirmQrSession(7, created.sceneToken, 'scan');
    expect(await service.getQrSessionStatus(created.sceneToken)).toEqual({
      status: 'scanned',
    });

    await service.confirmQrSession(7, created.sceneToken, 'confirm');
    const confirmed = await service.getQrSessionStatus(created.sceneToken);
    expect(confirmed).toMatchObject({
      status: 'confirmed',
      accessToken: 'signed.jwt.token',
      refreshToken: 'signed.jwt.token',
      technician: expect.objectContaining({ id: 7, phone: '13800138000' }),
    });

    // 会话已销毁，再次轮询应返回 expired
    expect(await service.getQrSessionStatus(created.sceneToken)).toEqual({
      status: 'expired',
    });
  });

  it('cancels a QR session and rejects expired/unknown tokens on confirm', async () => {
    const created = await service.createQrSession();
    await service.confirmQrSession(7, created.sceneToken, 'cancel');
    expect(await service.getQrSessionStatus(created.sceneToken)).toEqual({
      status: 'expired',
    });

    await expect(
      service.confirmQrSession(7, 'nonexistent_token', 'confirm'),
    ).rejects.toThrow(BadRequestException);
  });
});
