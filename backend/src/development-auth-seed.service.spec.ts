import { ConfigService } from '@nestjs/config';
import { DevelopmentAuthSeedService } from './development-auth-seed.service';

describe('DevelopmentAuthSeedService', () => {
  let service: DevelopmentAuthSeedService;
  let prisma: {
    adminRole: { upsert: jest.Mock };
    adminPermission: { upsert: jest.Mock; findUnique: jest.Mock };
    adminRolePermission: { upsert: jest.Mock };
    adminUser: { findUnique: jest.Mock; create: jest.Mock };
    subscriptionPlan: { findUnique: jest.Mock; create: jest.Mock };
    technician: { findUnique: jest.Mock; create: jest.Mock };
    technicianSubscription: { findUnique: jest.Mock; create: jest.Mock };
    clientUser: { findUnique: jest.Mock; create: jest.Mock };
    clientTechBinding: {
      findUnique: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
    customer: { findFirst: jest.Mock; create: jest.Mock };
  };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    prisma = {
      adminRole: { upsert: jest.fn() },
      adminPermission: { upsert: jest.fn(), findUnique: jest.fn() },
      adminRolePermission: { upsert: jest.fn() },
      adminUser: { findUnique: jest.fn(), create: jest.fn() },
      subscriptionPlan: { findUnique: jest.fn(), create: jest.fn() },
      technician: { findUnique: jest.fn(), create: jest.fn() },
      technicianSubscription: { findUnique: jest.fn(), create: jest.fn() },
      clientUser: { findUnique: jest.fn(), create: jest.fn() },
      clientTechBinding: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      customer: { findFirst: jest.fn(), create: jest.fn() },
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') {
          return 'development';
        }
        return undefined;
      }),
    };

    prisma.adminRole.upsert.mockResolvedValue({ id: 1 });
    prisma.adminPermission.upsert.mockImplementation(
      ({ create }: { create: { id?: number; code: string } }) => ({
        id: create.id ?? 1,
        code: create.code,
      }),
    );
    prisma.adminPermission.findUnique.mockImplementation(
      ({ where }: { where: { code: string } }) => ({
        id: where.code.length,
        code: where.code,
      }),
    );
    prisma.adminUser.findUnique.mockResolvedValue(null);
    prisma.adminUser.create.mockResolvedValue({ id: 1 });
    prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
    prisma.subscriptionPlan.create.mockResolvedValue({ id: 10 });
    prisma.technician.findUnique.mockResolvedValue(null);
    prisma.technician.create.mockResolvedValue({ id: 7 });
    prisma.technicianSubscription.findUnique.mockResolvedValue(null);
    prisma.technicianSubscription.create.mockResolvedValue({ id: 70 });
    prisma.clientUser.findUnique.mockResolvedValue(null);
    prisma.clientUser.create.mockResolvedValue({ id: 11 });
    prisma.clientTechBinding.findUnique.mockResolvedValue(null);
    prisma.clientTechBinding.count.mockResolvedValue(0);
    prisma.clientTechBinding.create.mockResolvedValue({ id: 21 });
    prisma.customer.findFirst.mockResolvedValue(null);
    prisma.customer.create.mockResolvedValue({ id: 31 });

    service = new DevelopmentAuthSeedService(
      prisma as any,
      configService as ConfigService,
    );
  });

  it('creates the minimal development login fixtures when they are missing', async () => {
    await service.onModuleInit();

    expect(prisma.adminUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: 'admin',
      }),
    });
    expect(prisma.technician.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '小美',
        phone: '13800138000',
        invitationCode: '123456',
      }),
    });
    expect(prisma.clientUser.create).toHaveBeenCalledWith({
      data: {
        phone: '13800138001',
        nickname: '王小美',
        status: 'active',
      },
    });
    expect(prisma.clientTechBinding.create).toHaveBeenCalledWith({
      data: {
        clientId: 11,
        techId: 7,
        inviteCode: '123456',
        bindSource: 'invite',
        isDefault: true,
        status: 'active',
      },
    });
  });

  it('skips seeding outside development', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'production';
      }
      return undefined;
    });

    await service.onModuleInit();

    expect(prisma.adminRole.upsert).not.toHaveBeenCalled();
    expect(prisma.adminUser.create).not.toHaveBeenCalled();
    expect(prisma.technician.create).not.toHaveBeenCalled();
    expect(prisma.clientUser.create).not.toHaveBeenCalled();
  });
});
