import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientBookingsController } from './client-bookings.controller';
import { ClientBookingsService } from './client-bookings.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClientBookingsController],
  providers: [ClientBookingsService],
})
export class ClientBookingsModule {}
