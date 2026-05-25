import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientAuthService } from './client-auth.service';
import { VerificationCodeService } from '../common/verification-code/verification-code.service';

describe('ClientAuthService', () => {
  let service: ClientAuthService;
  let prisma: {
    $transaction: jest.Mock;
    technician: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
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
  let verificationCodeService: { generate: jest.Mock; validate: jest.Mock };

  function createService() {
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
    verificationCodeService = {
      generate: jest.fn(),
      validate: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );

    service = new ClientAuthService(
      prisma as any,
      jwtService as JwtService,
      {} as ConfigService,
      verificationCodeService as unknown as VerificationCodeService,
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
      new UnauthorizedException(
        '该账号尚未绑定美甲师，请先通过邀请码注册/绑定',
      ),
    );
  });

  it('generates a verification code when the client can request a login code', async () => {
    prisma.clientUser.findUnique.mockResolvedValueOnce({
      id: 11,
      phone: '13800138001',
      status: 'active',
      bindings: [{ id: 21, status: 'active' }],
    });

    await expect(service.requestLoginCode('13800138001')).resolves.toEqual({
      codeSent: true,
    });
    expect(verificationCodeService.generate).toHaveBeenCalledWith(
      '13800138001',
    );
  });

  it('validates the code via VerificationCodeService on login', async () => {
    prisma.clientUser.findUnique.mockResolvedValueOnce({
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

    await expect(
      service.login({
        phone: '13800138001',
        code: '654321',
      }),
    ).resolves.toMatchObject({
      accessToken: 'client-jwt',
      client: { id: 11 },
      technician: { id: 7 },
    });
    expect(verificationCodeService.validate).toHaveBeenCalledWith(
      '13800138001',
      '654321',
    );
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
      new UnauthorizedException(
        '该账号尚未绑定美甲师，请先通过邀请码注册/绑定',
      ),
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

  it('generates a verification code when the invite code is valid for registration', async () => {
    prisma.technician.findFirst.mockResolvedValueOnce({
      id: 7,
      invitationCode: 'AB12CD34',
      status: 'active',
    });

    await expect(
      service.requestRegisterCode('13800138001', 'AB12CD34'),
    ).resolves.toEqual({
      codeSent: true,
    });
    expect(verificationCodeService.generate).toHaveBeenCalledWith(
      '13800138001',
    );
  });

  it('validates the code via VerificationCodeService on register by invite', async () => {
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

    await expect(
      service.registerByInvite({
        phone: '13800000000',
        code: '654321',
        techId: 999,
        inviteCode: 'AB12CD34',
      }),
    ).resolves.toMatchObject({
      accessToken: 'client-jwt',
      client: { id: 11 },
      technician: { id: 7 },
    });
    expect(verificationCodeService.validate).toHaveBeenCalledWith(
      '13800000000',
      '654321',
    );
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
    expect(result).toMatchObject({
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

  it('delegates code validation to VerificationCodeService', async () => {
    verificationCodeService.validate.mockImplementation(() => {
      throw new UnauthorizedException('验证码错误');
    });

    await expect(
      service.login({
        phone: '13800000000',
        code: '000000',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(verificationCodeService.validate).toHaveBeenCalledWith(
      '13800000000',
      '000000',
    );
    expect(prisma.clientUser.findUnique).not.toHaveBeenCalled();
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
    expect(result).toMatchObject({
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
    expect(result).toMatchObject({
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
    expect(result).toMatchObject({
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
