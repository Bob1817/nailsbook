import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { LeadsService } from './leads.service';
import {
  CreateLeadFollowUpDto,
  CreateTechnicianLeadDto,
  UpdateLeadStatusDto,
} from './dto/lead.dto';
import { SubmitPublicInquiryDto } from './dto/submit-public-inquiry.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('public/inquiries')
export class PublicInquiriesController {
  constructor(private readonly service: LeadsService) {}
  @Post() create(
    @Req() req: { user: { technicianId: number } },
    @Body() dto: CreateTechnicianLeadDto,
  ) {
    return this.service.createManual(req.user.technicianId, dto);
  }
  @Post()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  submit(@Body() dto: SubmitPublicInquiryDto) {
    return this.service.submitPublic(dto);
  }
}

@Controller('technician/leads')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class LeadsController {
  constructor(private readonly service: LeadsService) {}
  @Get() list(
    @Req() req: { user: { technicianId: number } },
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('followUpFrom') from?: string,
    @Query('followUpTo') to?: string,
  ) {
    return this.service.findAll(
      req.user.technicianId,
      source,
      status,
      from,
      to,
    );
  }
  @Get(':id') detail(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(req.user.technicianId, id);
  }
  @Patch(':id/status') status(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.service.updateStatus(req.user.technicianId, id, dto);
  }
  @Post(':id/follow-ups') followUp(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLeadFollowUpDto,
  ) {
    return this.service.addFollowUp(req.user.technicianId, id, dto);
  }
  @Post(':id/convert-customer') convert(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.convertToCustomer(req.user.technicianId, id);
  }
}
