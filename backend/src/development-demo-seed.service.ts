import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './common/prisma/prisma.service';
import { ensureDemoData } from './demo-data.seed';

@Injectable()
export class DevelopmentDemoSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevelopmentDemoSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.configService.get<string>('NODE_ENV') !== 'development') {
      return;
    }

    if (this.configService.get<string>('AUTO_SEED_DEMO_DATA') === 'false') {
      return;
    }

    const result = await ensureDemoData(this.prisma);
    this.logger.log(
      `Development demo data verified for technician ${result.technicianPhone} with ${result.clientPhones.length} clients`,
    );
  }
}
