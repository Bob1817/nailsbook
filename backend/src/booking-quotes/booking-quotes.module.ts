import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import {
  ClientBookingQuotesController,
  PublicBookingQuotesController,
  TechnicianBookingQuotesController,
} from './booking-quotes.controller';
import { BookingQuotesService } from './booking-quotes.service';

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [
    TechnicianBookingQuotesController,
    PublicBookingQuotesController,
    ClientBookingQuotesController,
  ],
  providers: [BookingQuotesService],
})
export class BookingQuotesModule {}
