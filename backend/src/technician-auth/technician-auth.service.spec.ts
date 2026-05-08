import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TechnicianAuthService } from './technician-auth.service';

describe('TechnicianAuthService', () => {
  let service: TechnicianAuthService;
  let prisma: {
    technician: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: {
    sign: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      technician: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn(),
    };
    service = new TechnicianAuthService(prisma as never, jwtService as JwtService);
  });

  it('returns the dev code when the technician is active and already invited', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce({
      id: 7,
      phone: '13800000000',
      status: 'active',
      invitationCode: 'INVITE123',
    });

    await expect(service.requestCode('13800000000')).resolves.toEqual({
      codeSent: true,
      devCode: '123456',
    });
    expect(prisma.technician.findUnique).toHaveBeenCalledWith({
      where: { phone: '13800000000' },
    });
  });

  it('rejects request-code when the phone has not been invited', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce(null);

    await expect(service.requestCode('13800000000')).rejects.toThrow(
      new UnauthorizedException('该账号未被邀请，无法登录'),
    );
  });

  it('rejects request-code when the technician account is suspended', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce({
      id: 7,
      phone: '13800000000',
      status: 'suspended',
      invitationCode: 'INVITE123',
    });

    await expect(service.requestCode('13800000000')).rejects.toThrow(
      new UnauthorizedException('账号已被禁用'),
    );
  });

  it('looks up request-code by the canonical +86 phone format', async () => {
    prisma.technician.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 7,
        phone: '+8613800000000',
        status: 'active',
        invitationCode: 'INVITE123',
      });

    await expect(service.requestCode('13800000000')).resolves.toEqual({
      codeSent: true,
      devCode: '123456',
    });
    expect(prisma.technician.findUnique).toHaveBeenNthCalledWith(1, {
      where: { phone: '13800000000' },
    });
    expect(prisma.technician.findUnique).toHaveBeenNthCalledWith(2, {
      where: { phone: '+8613800000000' },
    });
  });

  it('logs in with a local CN phone when the stored phone is canonical +86', async () => {
    prisma.technician.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 7,
        name: 'Anna',
        phone: '+8613800000000',
        avatarUrl: null,
        city: 'Shanghai',
        serviceArea: 'Pudong',
        status: 'active',
        invitationCode: '123456',
        subscription: null,
      });
    prisma.technician.update.mockResolvedValueOnce(undefined);
    jwtService.sign.mockReturnValueOnce('technician-jwt');

    await expect(service.login('13800000000', '123456')).resolves.toMatchObject({
      accessToken: 'technician-jwt',
      technician: {
        id: 7,
        phone: '+8613800000000',
      },
    });
    expect(prisma.technician.findUnique).toHaveBeenNthCalledWith(1, {
      where: { phone: '13800000000' },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });
    expect(prisma.technician.findUnique).toHaveBeenNthCalledWith(2, {
      where: { phone: '+8613800000000' },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });
  });

  it('rejects login when the technician is inactive', async () => {
    prisma.technician.findUnique.mockResolvedValueOnce({
      id: 7,
      name: 'Anna',
      phone: '13800000000',
      avatarUrl: null,
      city: 'Shanghai',
      serviceArea: 'Pudong',
      status: 'inactive',
      invitationCode: '123456',
      subscription: null,
    });

    await expect(service.login('13800000000', '123456')).rejects.toThrow(
      new UnauthorizedException('账号已被禁用'),
    );
  });
});
