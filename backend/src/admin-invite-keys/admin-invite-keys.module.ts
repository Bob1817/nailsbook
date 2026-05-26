import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminInviteKeysController } from './admin-invite-keys.controller';
import { AdminInviteKeysService } from './admin-invite-keys.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminInviteKeysController],
  providers: [AdminInviteKeysService],
})
export class AdminInviteKeysModule {}
