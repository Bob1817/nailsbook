import { Module } from '@nestjs/common';
import { CustomServiceRequestsService } from './custom-service-requests.service';
import { ClientCustomServiceRequestsController } from './client-custom-service-requests.controller';
import { TechnicianCustomServiceRequestsController } from './technician-custom-service-requests.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    ClientCustomServiceRequestsController,
    TechnicianCustomServiceRequestsController,
  ],
  providers: [CustomServiceRequestsService],
  exports: [CustomServiceRequestsService],
})
export class CustomServiceRequestsModule {}
