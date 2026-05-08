import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulesService } from './schedules.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
