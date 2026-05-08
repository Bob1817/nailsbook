import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { TechnicianBookingsController } from './technician-bookings.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BookingsController, TechnicianBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
