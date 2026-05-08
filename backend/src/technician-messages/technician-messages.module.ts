import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianMessagesController } from './technician-messages.controller';
import { TechnicianMessagesService } from './technician-messages.service';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicianMessagesController],
  providers: [TechnicianMessagesService],
})
export class TechnicianMessagesModule {}
