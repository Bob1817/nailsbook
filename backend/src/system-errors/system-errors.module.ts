import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SystemErrorsService } from './system-errors.service';
import {
  PublicErrorReportsController,
  AdminSystemErrorsController,
} from './system-errors.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicErrorReportsController, AdminSystemErrorsController],
  providers: [SystemErrorsService],
  exports: [SystemErrorsService],
})
export class SystemErrorsModule {}
