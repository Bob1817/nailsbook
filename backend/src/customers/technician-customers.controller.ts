import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';

@Controller('technician/customers')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(
    @Req() request: { user: { technicianId: number } },
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    return this.customersService.findAll(1, 100, request.user.technicianId, search, tags);
  }

  @Get(':id')
  findOne(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    return this.customersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
  }
}
