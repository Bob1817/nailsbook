import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientBookingsService } from './client-bookings.service';
import { CreateClientBookingDto } from './dto/create-client-booking.dto';
import { UpdateClientBookingDto } from './dto/update-client-booking.dto';
import { CreateBookingFromDesignDto } from './dto/create-booking-from-design.dto';
import { UpdateClientBookingStatusDto } from './dto/update-client-booking-status.dto';

@Controller('client/bookings')
@UseGuards(ClientJwtAuthGuard)
export class ClientBookingsController {
  constructor(private readonly clientBookingsService: ClientBookingsService) {}

  @Post()
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientBookingDto,
  ) {
    return this.clientBookingsService.create(request.user.clientUserId, dto);
  }

  @Post('from-design')
  createFromDesign(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateBookingFromDesignDto,
  ) {
    return this.clientBookingsService.createFromDesign(request.user.clientUserId, dto);
  }

  @Get()
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.clientBookingsService.findAll(request.user.clientUserId);
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientBookingsService.findOne(request.user.clientUserId, id);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientBookingDto,
  ) {
    return this.clientBookingsService.update(request.user.clientUserId, id, dto);
  }

  @Post(':id/confirm')
  confirm(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientBookingsService.confirm(request.user.clientUserId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientBookingStatusDto,
  ) {
    return this.clientBookingsService.updateStatus(request.user.clientUserId, id, dto.status);
  }
}
