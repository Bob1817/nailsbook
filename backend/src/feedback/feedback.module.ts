import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { TechnicianAuthModule } from '../technician-auth/technician-auth.module';
import { FeedbackService } from './feedback.service';
import { ClientFeedbackController } from './client-feedback.controller';
import { TechnicianFeedbackController } from './technician-feedback.controller';
import { AdminFeedbackController } from './admin-feedback.controller';

@Module({
  imports: [PrismaModule, AuthModule, ClientAuthModule, TechnicianAuthModule],
  controllers: [
    ClientFeedbackController,
    TechnicianFeedbackController,
    AdminFeedbackController,
  ],
  providers: [FeedbackService],
})
export class FeedbackModule {}
