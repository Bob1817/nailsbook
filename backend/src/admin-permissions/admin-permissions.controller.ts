import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { AdminPermissionsService } from './admin-permissions.service';

@Controller('admin/permissions')
@UseGuards(JwtAuthGuard)
export class AdminPermissionsController {
  constructor(private readonly service: AdminPermissionsService) {}

  @Get()
  @Permissions('role:view')
  findAll() {
    return this.service.findAll();
  }

  @Get('grouped')
  @Permissions('role:view')
  findAllGrouped() {
    return this.service.findAllGrouped();
  }
}
