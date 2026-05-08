import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientMessagesController } from './client-messages.controller';
import { ClientMessagesService } from './client-messages.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClientMessagesController],
  providers: [ClientMessagesService],
})
export class ClientMessagesModule {}
