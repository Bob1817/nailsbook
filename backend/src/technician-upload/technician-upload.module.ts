import { Module } from '@nestjs/common';
import { TechnicianUploadController } from './technician-upload.controller';
import { TechnicianUploadService } from './technician-upload.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [SubscriptionsModule, PrismaModule],
  controllers: [TechnicianUploadController],
  providers: [TechnicianUploadService],
})
export class TechnicianUploadModule {}
