import { Body, Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { CustomServiceRequestsService } from './custom-service-requests.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { QuoteCustomServiceRequestDto } from './dto/quote-custom-service-request.dto';

@Controller('technician/custom-service-requests')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianCustomServiceRequestsController {
  constructor(private readonly customServiceRequestsService: CustomServiceRequestsService) {}

  @Get()
  findAll(
    @Req() request: { user: { technicianId: number } },
  ) {
    return this.customServiceRequestsService.findAllForTechnician(request.user.technicianId);
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.findOneForTechnician(request.user.technicianId, id);
  }

  @Patch(':id/quote')
  quote(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: QuoteCustomServiceRequestDto,
  ) {
    return this.customServiceRequestsService.quote(request.user.technicianId, id, dto);
  }
}
