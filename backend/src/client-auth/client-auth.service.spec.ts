import {
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientAuthService } from './client-auth.service';

describe('ClientAuthService', () => {
  let service: ClientAuthService;
  let prisma: {
    $transaction: jest.Mock;
    technician: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    clientUser: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    clientTechBinding: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };

  function createService(configOverrides: Record<string, string | undefined> = {}) {
    prisma = {
      $transaction: jest.fn(),
      technician: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      clientUser: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      clientTechBinding: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('client-jwt'),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key in configOverrides) {
          return configOverrides[key];
        }

        if (key === 'CLIENT_MVP_VERIFICATION_CODE') {
          return '123456';
        }

        if (key === 'NODE_ENV') {
          return 'development';
        }

        return undefined;
      }),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );

    service = new ClientAuthService(
      prisma as any,
      jwtService as JwtService,
      configService as ConfigService,
    );
  }

  beforeEach(() => {
    createService();
  });

  it('rejects requesting a client login code when the phone is not registered', async () => {
    prisma.clientUser.findUnique.mockResolvedValueOnce(null);

    await expect(service.requestLoginCode('13800138001')).rejects.toThrow(
      new UnauthorizedException('该手机号码还未注册，请先注册后再登录'),
    );
  });

  it('rejects requesting a client login code when the client is disabled', async () => {
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      phone: '13800138001',
      status: 'disabled',
      bindings: [{ id: 21, status: 'active' }],
    });

    await expect(service.requestLoginCode('13800138001')).rejects.toThrow(
      new UnauthorizedException('账号已被禁用'),
    );
  });

  it('rejects requesting a client login code when the user has no active bindings', async () => {
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      phone: '13800138001',
      status: 'active',
      bindings: [],
    });

    await expect(service.requestLoginCode('13800138001')).rejects.toThrow(
      new UnauthorizedException('该账号尚未绑定美甲师，请先通过邀请码注册/绑定'),
    );
  });

  it('returns the dev verification code when the client can request a login code', async () => {
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      phone: '13800138001',
      status: 'active',
      bindings: [{ id: 21, status: 'active' }],
    });

    await expect(service.requestLoginCode('13800138001')).resolves.toEqual({
      codeSent: true,
      devCode: '123456',
    });
  });

  it('returns the same configured code from request login that login accepts', async () => {
    createService({
      CLIENT_MVP_VERIFICATION_CODE: '654321',
    });
    prisma.clientUser.findUnique
      .mockResolvedValueOnce({
        id: 11,
        phone: '13800138001',
        status: 'active',
        bindings: [{ id: 21, status: 'active' }],
      })
      .mockResolvedValueOnce({
        id: 11,
        nickname: '小美',
        phone: '13800138001',
        avatarUrl: null,
        status: 'active',
        bindings: [
          {
            id: 21,
            techId: 7,
            isDefault: true,
            bindSource: 'invite',
            technician: {
              id: 7,
              name: 'Anna',
              phone: '13900000000',
              avatarUrl: null,
              city: 'Shanghai',
              serviceArea: 'Pudong',
              status: 'active',
            },
          },
        ],
      });

    const response = await service.requestLoginCode('13800138001');

    expect(response).toEqual({
      codeSent: true,
      devCode: '654321',
    });
    await expect(
      service.login({
        phone: '13800138001',
        code: response.devCode,
      }),
    ).resolves.toMatchObject({
      accessToken: 'client-jwt',
      client: { id: 11 },
      technician: { id: 7 },
    });
  });

  it('rejects login with the unified no-binding message when the client has no active bindings', async () => {
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      nickname: '小美',
      phone: '13800138001',
      avatarUrl: null,
      status: 'active',
      bindings: [],
    });

    await expect(
      service.login({
        phone: '13800138001',
        code: '123456',
      }),
    ).rejects.toThrow(
      new UnauthorizedException('该账号尚未绑定美甲师，请先通过邀请码注册/绑定'),
    );
  });

  it('rejects requesting a client register code for an invalid invite code', async () => {
    prisma.technician.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.requestRegisterCode('13800138001', 'BADCODE'),
    ).rejects.toThrow(
      new NotFoundException('该邀请码无效，请跟您的美甲师确认后再注册'),
    );
  });

  it('returns the dev verification code when the invite code is valid for registration', async () => {
    prisma.technician.findFirst.mockResolvedValueOnce({
      id: 7,
      invitationCode: 'AB12CD34',
      status: 'active',
    });

    await expect(
      service.requestRegisterCode('13800138001', 'AB12CD34'),
    ).resolves.toEqual({
      codeSent: true,
      devCode: '123456',
    });
  });

  it('returns the same configured code from request register that registration accepts', async () => {
    createService({
      CLIENT_MVP_VERIFICATION_CODE: '654321',
    });
    prisma.technician.findFirst
      .mockResolvedValueOnce({
        id: 7,
        name: 'Anna',
        phone: '13900000000',
        status: 'active',
        invitationCode: 'AB12CD34',
      })
      .mockResolvedValueOnce({
        id: 7,
        name: 'Anna',
        phone: '13900000000',
        status: 'active',
        invitationCode: 'AB12CD34',
      });
    prisma.clientUser.upsert.mockResolvedValueOnce({
      id: 11,
      nickname: null,
      phone: '13800000000',
      status: 'active',
    });
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce(null);
    prisma.clientTechBinding.count.mockResolvedValueOnce(0);
    prisma.clientTechBinding.create.mockResolvedValueOnce({
      id: 31,
      clientId: 11,
      techId: 7,
      inviteCode: 'AB12CD34',
      bindSource: 'invite',
      isDefault: true,
      status: 'active',
    });

    const response = await service.requestRegisterCode('13800000000', 'AB12CD34');

    expect(response).toEqual({
      codeSent: true,
      devCode: '654321',
    });
    await expect(
      service.registerByInvite({
        phone: '13800000000',
        code: response.devCode,
        techId: 999,
        inviteCode: 'AB12CD34',
      }),
    ).resolves.toMatchObject({
      accessToken: 'client-jwt',
      client: { id: 11 },
      technician: { id: 7 },
    });
  });

  it('registers by invite code authority instead of trusting techId', async () => {
    prisma.technician.findFirst.mockResolvedValueOnce({
      id: 7,
      name: 'Anna',
      phone: '13900000000',
      status: 'active',
      invitationCode: 'AB12CD34',
    });
    prisma.clientUser.upsert.mockResolvedValueOnce({
      id: 11,
      nickname: null,
      phone: '13800000000',
      status: 'active',
    });
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce(null);
    prisma.clientTechBinding.count.mockResolvedValueOnce(0);
    prisma.clientTechBinding.create.mockResolvedValueOnce({
      id: 31,
      clientId: 11,
      techId: 7,
      inviteCode: 'AB12CD34',
      bindSource: 'invite',
      isDefault: true,
      status: 'active',
    });

    const result = await service.registerByInvite({
      phone: '13800000000',
      code: '123456',
      techId: 999,
      inviteCode: 'AB12CD34',
    });

    expect(prisma.technician.findFirst).toHaveBeenCalledWith({
      where: {
        invitationCode: 'AB12CD34',
        status: 'active',
      },
    });
    expect(prisma.clientTechBinding.create).toHaveBeenCalledWith({
      data: {
        clientId: 11,
        techId: 7,
        inviteCode: 'AB12CD34',
        bindSource: 'invite',
        isDefault: true,
      },
    });
    expect(result).toEqual({
      accessToken: 'client-jwt',
      client: {
        id: 11,
        nickname: null,
        phone: '13800000000',
        status: 'active',
      },
      technician: {
        id: 7,
        name: 'Anna',
        phone: '13900000000',
      },
    });
  });

  it('rejects register by invite when the invite code is invalid', async () => {
    prisma.technician.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.registerByInvite({
        phone: '13800000000',
        code: '123456',
        techId: 999,
        inviteCode: 'BADCODE',
      }),
    ).rejects.toThrow(
      new NotFoundException('该邀请码无效，请跟您的美甲师确认后再注册'),
    );
  });

  it('rejects the 123456 fallback when dev opt-in is absent', async () => {
    createService({
      CLIENT_MVP_VERIFICATION_CODE: undefined,
    });
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      nickname: '小美',
      phone: '13800000000',
      avatarUrl: null,
      status: 'active',
      bindings: [
        {
          id: 21,
          techId: 7,
          isDefault: true,
          bindSource: 'invite',
          technician: {
            id: 7,
            name: 'Anna',
            phone: '13900000000',
            avatarUrl: null,
            city: 'Shanghai',
            serviceArea: 'Pudong',
            status: 'active',
          },
        },
      ],
    });

    await expect(
      service.login({
        phone: '13800000000',
        code: '123456',
      }),
    ).rejects.toThrow(new UnauthorizedException('手机号或验证码错误'));
    expect(prisma.clientUser.findUnique).not.toHaveBeenCalled();
  });

  it('allows the 123456 fallback only with explicit development opt-in', async () => {
    createService({
      CLIENT_MVP_VERIFICATION_CODE: undefined,
      ALLOW_DEV_MVP_VERIFICATION_CODE: 'true',
    });
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      nickname: '小美',
      phone: '13800000000',
      avatarUrl: null,
      status: 'active',
      bindings: [
        {
          id: 21,
          techId: 7,
          isDefault: true,
          bindSource: 'invite',
          technician: {
            id: 7,
            name: 'Anna',
            phone: '13900000000',
            avatarUrl: null,
            city: 'Shanghai',
            serviceArea: 'Pudong',
            status: 'active',
          },
        },
      ],
    });

    await expect(
      service.login({
        phone: '13800000000',
        code: '123456',
      }),
    ).resolves.toMatchObject({
      accessToken: 'client-jwt',
      client: {
        id: 11,
      },
      technician: {
        id: 7,
      },
    });
  });

  it('adds a second active binding when an already-bound client registers with another technician', async () => {
    prisma.technician.findFirst.mockResolvedValueOnce({
      id: 8,
      name: 'Bella',
      phone: '13900000008',
      status: 'active',
      invitationCode: 'INVITE888',
    });
    prisma.clientUser.upsert.mockResolvedValueOnce({
      id: 11,
      nickname: '小美',
      phone: '13800000000',
      status: 'active',
    });
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce(null);
    prisma.clientTechBinding.count.mockResolvedValueOnce(1);
    prisma.clientTechBinding.create.mockResolvedValueOnce({
      id: 32,
      clientId: 11,
      techId: 8,
      inviteCode: 'INVITE888',
      bindSource: 'invite',
      isDefault: false,
      status: 'active',
    });

    const result = await service.registerByInvite({
      phone: '13800000000',
      code: '123456',
      techId: 8,
      inviteCode: 'INVITE888',
    });

    expect(prisma.clientTechBinding.findUnique).toHaveBeenCalledWith({
      where: {
        clientId_techId: {
          clientId: 11,
          techId: 8,
        },
      },
    });
    expect(prisma.clientTechBinding.create).toHaveBeenCalledWith({
      data: {
        clientId: 11,
        techId: 8,
        inviteCode: 'INVITE888',
        bindSource: 'invite',
        isDefault: false,
      },
    });
    expect(prisma.clientTechBinding.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'client-jwt',
      client: {
        id: 11,
        nickname: '小美',
        phone: '13800000000',
        status: 'active',
      },
      technician: {
        id: 8,
        name: 'Bella',
        phone: '13900000008',
      },
    });
  });

  it('returns an auth response when the client is already actively bound to the same technician', async () => {
    prisma.technician.findFirst.mockResolvedValueOnce({
      id: 7,
      name: 'Anna',
      phone: '13900000000',
      status: 'active',
      invitationCode: 'INVITE123',
    });
    prisma.clientUser.upsert.mockResolvedValueOnce({
      id: 11,
      nickname: '小美',
      phone: '13800000000',
      status: 'active',
    });
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce({
      id: 21,
      clientId: 11,
      techId: 7,
      status: 'active',
      inviteCode: 'INVITE123',
      bindSource: 'invite',
      isDefault: true,
    });

    const result = await service.registerByInvite({
      phone: '13800000000',
      code: '123456',
      techId: 7,
      inviteCode: 'INVITE123',
    });

    expect(prisma.clientTechBinding.create).not.toHaveBeenCalled();
    expect(prisma.clientTechBinding.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'client-jwt',
      client: {
        id: 11,
        nickname: '小美',
        phone: '13800000000',
        status: 'active',
      },
      technician: {
        id: 7,
        name: 'Anna',
        phone: '13900000000',
      },
    });
  });

  it('reactivates an inactive binding for the same technician and returns an auth response', async () => {
    prisma.technician.findFirst.mockResolvedValueOnce({
      id: 7,
      name: 'Anna',
      phone: '13900000000',
      status: 'active',
      invitationCode: 'INVITE123',
    });
    prisma.clientUser.upsert.mockResolvedValueOnce({
      id: 11,
      nickname: '小美',
      phone: '13800000000',
      status: 'active',
    });
    prisma.clientTechBinding.findUnique.mockResolvedValueOnce({
      id: 21,
      clientId: 11,
      techId: 7,
      status: 'inactive',
      inviteCode: 'OLDCODE',
      bindSource: 'invite',
      isDefault: false,
    });
    prisma.clientTechBinding.update.mockResolvedValueOnce({
      id: 21,
      clientId: 11,
      techId: 7,
      status: 'active',
      inviteCode: 'INVITE123',
      bindSource: 'invite',
      isDefault: false,
    });

    const result = await service.registerByInvite({
      phone: '13800000000',
      code: '123456',
      techId: 7,
      inviteCode: 'INVITE123',
    });

    expect(prisma.clientTechBinding.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: {
        status: 'active',
      },
    });
    expect(prisma.clientTechBinding.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'client-jwt',
      client: {
        id: 11,
        nickname: '小美',
        phone: '13800000000',
        status: 'active',
      },
      technician: {
        id: 7,
        name: 'Anna',
        phone: '13900000000',
      },
    });
  });
});
