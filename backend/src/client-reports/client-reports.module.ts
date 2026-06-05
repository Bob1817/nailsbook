import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { ClientReportsController } from './client-reports.controller';
import { ClientReportsService } from './client-reports.service';

@Module({
  imports: [PrismaModule, ClientAuthModule],
  controllers: [ClientReportsController],
  providers: [ClientReportsService],
})
export class ClientReportsModule {}
