import { Module } from '@nestjs/common';
import { OperationLogsService } from './operation-logs.service';
import { OperationLogsController } from './operation-logs.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperationLogsController],
  providers: [OperationLogsService],
  exports: [OperationLogsService],
})
export class OperationLogsModule {}
