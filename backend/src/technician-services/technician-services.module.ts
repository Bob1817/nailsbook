import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianServicesController } from './technician-services.controller';
import { TechnicianServicesService } from './technician-services.service';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicianServicesController],
  providers: [TechnicianServicesService],
  exports: [TechnicianServicesService],
})
export class TechnicianServicesModule {}
