import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { CreateTechnicianBookingDto } from './dto/create-technician-booking.dto';
import { ReviewBookingDto } from './dto/review-booking.dto';

@Controller('technician/bookings')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() body: CreateTechnicianBookingDto,
  ) {
    return this.bookingsService.createForTechnician(request.user.technicianId, body);
  }

  @Get()
  findAll(
    @Req() request: { user: { technicianId: number } },
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.bookingsService.findAll(
      1,
      100,
      request.user.technicianId,
      customerId ? parseInt(customerId, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  findOne(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    return this.bookingsService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
  }

  @Patch(':id/confirm')
  async confirm(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    await this.bookingsService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.bookingsService.confirm(parseInt(id, 10));
  }

  @Patch(':id/review')
  async review(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: ReviewBookingDto,
  ) {
    await this.bookingsService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.bookingsService.review(parseInt(id, 10), request.user.technicianId, body);
  }

  @Patch(':id/complete')
  async complete(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    await this.bookingsService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.bookingsService.complete(parseInt(id, 10));
  }

  @Patch(':id/cancel')
  async cancel(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    await this.bookingsService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.bookingsService.cancel(parseInt(id, 10));
  }
}
