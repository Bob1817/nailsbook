import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { BookingQuotesService } from './booking-quotes.service';
import { BookBookingQuoteDto } from './dto/book-booking-quote.dto';
import { CreateBookingQuoteDto } from './dto/create-booking-quote.dto';
import { DeclineBookingQuoteDto } from './dto/decline-booking-quote.dto';

@Controller('technician/booking-quotes')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianBookingQuotesController {
  constructor(private readonly quotes: BookingQuotesService) {}
  @Post() create(
    @Req() req: { user: { technicianId: number } },
    @Body() dto: CreateBookingQuoteDto,
  ) {
    return this.quotes.create(req.user.technicianId, dto);
  }
  @Get() list(@Req() req: { user: { technicianId: number } }) {
    return this.quotes.list(req.user.technicianId);
  }
  @Get(':id') detail(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quotes.detail(req.user.technicianId, id);
  }
  @Patch(':id/withdraw') withdraw(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quotes.withdraw(req.user.technicianId, id);
  }
}

@Controller('public/booking-quotes')
export class PublicBookingQuotesController {
  constructor(private readonly quotes: BookingQuotesService) {}
  @Get(':token') detail(@Param('token') token: string) {
    return this.quotes.publicDetail(token);
  }
  @Post(':token/decline') decline(
    @Param('token') token: string,
    @Body() dto: DeclineBookingQuoteDto,
  ) {
    return this.quotes.decline(token, dto.reason);
  }
}

@Controller('client/booking-quotes')
@UseGuards(ClientJwtAuthGuard)
export class ClientBookingQuotesController {
  constructor(private readonly quotes: BookingQuotesService) {}
  @Post(':token/accept') accept(
    @Req() req: { user: { clientUserId: number } },
    @Param('token') token: string,
  ) {
    return this.quotes.accept(req.user.clientUserId, token);
  }
  @Post(':token/book') book(
    @Req() req: { user: { clientUserId: number } },
    @Param('token') token: string,
    @Body() dto: BookBookingQuoteDto,
  ) {
    return this.quotes.book(req.user.clientUserId, token, dto);
  }
}
