import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianInsightsController } from './technician-insights.controller';
import { TechnicianInsightsService } from './technician-insights.service';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicianInsightsController],
  providers: [TechnicianInsightsService],
})
export class TechnicianInsightsModule {}
