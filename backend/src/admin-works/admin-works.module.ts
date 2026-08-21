import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminWorksController } from './admin-works.controller';
import { AdminWorksService } from './admin-works.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminWorksController],
  providers: [AdminWorksService],
})
export class AdminWorksModule {}
