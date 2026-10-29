import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
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

class UpdateBookingCapacityDto {
  @IsInt() @Min(1) @Max(10) dailyBookingLimit: number;
  @IsInt() @Min(15) @Max(180) appointmentBufferMinutes: number;
}

class CreateBlockedSlotDto {
  @IsNotEmpty()
  startTime: string;

  @IsNotEmpty()
  endTime: string;

  @IsOptional()
  @IsString()
  reason?: string;
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
  @Get('blocked-slots')
  listBlockedSlots(
    @Req() req: { user: { technicianId: number } },
    @Query('date') date?: string,
  ) {
    return this.days.listBlockedSlots(req.user.technicianId, date);
  }
  @Post('blocked-slots')
  createBlockedSlot(
    @Req() req: { user: { technicianId: number } },
    @Body() dto: CreateBlockedSlotDto,
  ) {
    return this.days.createBlockedSlot(req.user.technicianId, dto);
  }
  @Delete('blocked-slots/:id')
  deleteBlockedSlot(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.days.deleteBlockedSlot(req.user.technicianId, id);
  }
  @Patch('settings')
  updateSettings(@Req() req: { user: { technicianId: number } }, @Body() dto: UpdateBookingSettingsDto) {
    return this.days.updateSettings(req.user.technicianId, dto.quickBookingEnabled);
  }
  @Patch('capacity')
  updateCapacity(@Req() req: { user: { technicianId: number } }, @Body() dto: UpdateBookingCapacityDto) {
    return this.days.updateCapacity(
      req.user.technicianId,
      dto.dailyBookingLimit,
      dto.appointmentBufferMinutes,
    );
  }
  @Patch(':serviceDate')
  update(@Req() req: { user: { technicianId: number } }, @Param('serviceDate') date: string, @Body() dto: UpdateBookingDayDto) {
    return this.days.update(req.user.technicianId, date, dto.accepting, dto.version);
  }
}
