import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminCommentsController } from './admin-comments.controller';
import { AdminCommentsService } from './admin-comments.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminCommentsController],
  providers: [AdminCommentsService],
})
export class AdminCommentsModule {}
