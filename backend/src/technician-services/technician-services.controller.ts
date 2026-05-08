import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TechnicianServicesService } from './technician-services.service';

@Controller('technician/services')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianServicesController {
  constructor(private readonly technicianServicesService: TechnicianServicesService) {}

  @Get()
  list(@Req() request: { user: { technicianId: number } }) {
    return this.technicianServicesService.list(request.user.technicianId);
  }

  @Post()
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() body: { name: string; description?: string; category: 'basic_care' | 'color_style' | 'extension_reinforcement' | 'removal' },
  ) {
    return this.technicianServicesService.create(request.user.technicianId, body);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; category?: 'basic_care' | 'color_style' | 'extension_reinforcement' | 'removal'; isActive?: boolean; sortOrder?: number },
  ) {
    return this.technicianServicesService.update(request.user.technicianId, id, body);
  }

  @Patch(':id/toggle')
  toggle(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    return this.technicianServicesService.toggleStatus(request.user.technicianId, id);
  }

  @Delete(':id')
  remove(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    return this.technicianServicesService.delete(request.user.technicianId, id);
  }
}
