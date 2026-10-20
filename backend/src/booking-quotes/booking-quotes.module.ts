import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { TechnicianWorksModule } from '../technician-works/technician-works.module';
import {
  ClientBookingQuotesController,
  PublicBookingQuotesController,
  TechnicianBookingQuotesController,
} from './booking-quotes.controller';
import { BookingQuotesService } from './booking-quotes.service';

@Module({
  imports: [PrismaModule, OrdersModule, TechnicianWorksModule],
  controllers: [
    TechnicianBookingQuotesController,
    PublicBookingQuotesController,
    ClientBookingQuotesController,
  ],
  providers: [BookingQuotesService],
})
export class BookingQuotesModule {}
