import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ActionTasksController } from './action-tasks.controller';
import { ActionTasksService } from './action-tasks.service';
@Module({
  imports: [PrismaModule],
  controllers: [ActionTasksController],
  providers: [ActionTasksService],
})
export class ActionTasksModule {}
