import { ConfigService } from '@nestjs/config';
import { DevelopmentDemoSeedService } from './development-demo-seed.service';
import { ensureDemoData } from './demo-data.seed';

jest.mock('./demo-data.seed', () => ({
  ensureDemoData: jest.fn(),
}));

describe('DevelopmentDemoSeedService', () => {
  let prisma: Record<string, never>;
  let configService: { get: jest.Mock };
  let service: DevelopmentDemoSeedService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {};
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') {
          return 'development';
        }
        if (key === 'AUTO_SEED_DEMO_DATA') {
          return 'true';
        }
        return undefined;
      }),
    };

    (ensureDemoData as jest.Mock).mockResolvedValue({
      technicianPhone: '13800138000',
      clientPhones: ['13800138001', '13800138002', '13800138003', '13800138004', '13800138005'],
      bookingNos: ['DEMO-BKG-1001'],
      revenueNos: ['DEMO-REV-1001'],
      artistApplicationPhones: ['13800138120'],
    });

    service = new DevelopmentDemoSeedService(prisma as any, configService as ConfigService);
  });

  it('runs the demo seed in development when auto seed is enabled', async () => {
    await service.onModuleInit();

    expect(ensureDemoData).toHaveBeenCalledWith(prisma);
  });

  it('skips auto seed outside development', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'production';
      }
      return undefined;
    });

    await service.onModuleInit();

    expect(ensureDemoData).not.toHaveBeenCalled();
  });

  it('skips auto seed when AUTO_SEED_DEMO_DATA is false', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'development';
      }
      if (key === 'AUTO_SEED_DEMO_DATA') {
        return 'false';
      }
      return undefined;
    });

    await service.onModuleInit();

    expect(ensureDemoData).not.toHaveBeenCalled();
  });
});
