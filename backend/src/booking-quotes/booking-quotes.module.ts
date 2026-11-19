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
import { PublicQuickQuotesController } from './quick-quotes.controller';
import { QuickQuotesService } from './quick-quotes.service';

@Module({
  imports: [PrismaModule, OrdersModule, TechnicianWorksModule],
  controllers: [
    TechnicianBookingQuotesController,
    PublicBookingQuotesController,
    ClientBookingQuotesController,
    PublicQuickQuotesController,
  ],
  providers: [BookingQuotesService, QuickQuotesService],
  exports: [BookingQuotesService, QuickQuotesService],
})
export class BookingQuotesModule {}

