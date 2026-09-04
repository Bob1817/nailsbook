import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';
import { AccountDeletionService } from './account-deletion.service';
import { ClientAccountDeletionController, TechnicianAccountDeletionController, AdminAccountDeletionController } from './account-deletion.controller';
@Module({
  imports: [PrismaModule, ChatModule],
  controllers: [ClientAccountDeletionController, TechnicianAccountDeletionController, AdminAccountDeletionController],
  providers: [AccountDeletionService],
})
export class AccountDeletionModule {}
