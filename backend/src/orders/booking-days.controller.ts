import { Body, Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, Min } from 'class-validator';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { BookingDaysService } from './booking-days.service';

class UpdateBookingDayDto {
  @IsBoolean() accepting: boolean;
  @IsInt() @Min(0) version: number;
}

class UpdateBookingSettingsDto {
  @IsBoolean() quickBookingEnabled: boolean;
}

@Controller('public/booking-settings')
export class PublicBookingDaysController {
  constructor(private readonly days: BookingDaysService) {}
  @Get(':technicianId')
  settings(@Param('technicianId', ParseIntPipe) id: number) { return this.days.settings(id); }
}

@Controller('technician/booking-days')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianBookingDaysController {
  constructor(private readonly days: BookingDaysService) {}
  @Get()
  settings(@Req() req: { user: { technicianId: number } }) { return this.days.settings(req.user.technicianId); }
  @Patch('settings')
  updateSettings(@Req() req: { user: { technicianId: number } }, @Body() dto: UpdateBookingSettingsDto) {
    return this.days.updateSettings(req.user.technicianId, dto.quickBookingEnabled);
  }
  @Patch(':serviceDate')
  update(@Req() req: { user: { technicianId: number } }, @Param('serviceDate') date: string, @Body() dto: UpdateBookingDayDto) {
    return this.days.update(req.user.technicianId, date, dto.accepting, dto.version);
  }
}
