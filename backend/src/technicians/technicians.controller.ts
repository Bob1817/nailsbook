import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianStatusDto } from './dto/update-technician-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { OperationLogInterceptor } from '../auth/operation-log.interceptor';

@Controller('admin/technicians')
@UseGuards(JwtAuthGuard)
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Get()
  @Permissions('technician.view')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.techniciansService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      search,
    );
  }

  @Get(':id')
  @Permissions('technician.view')
  findOne(@Param('id') id: string) {
    return this.techniciansService.findOne(parseInt(id, 10));
  }

  @Post()
  @Permissions('technician.create')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'technician', action: 'create', targetType: 'technician' })
  create(@Body() dto: CreateTechnicianDto) {
    return this.techniciansService.create(dto);
  }

  @Patch(':id/status')
  @Permissions('technician.disable')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'technician', action: 'update_status', targetType: 'technician' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTechnicianStatusDto) {
    return this.techniciansService.updateStatus(parseInt(id, 10), dto);
  }
}
