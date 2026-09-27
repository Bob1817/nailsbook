import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './admin-users.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @Permissions('role:view')
  findAll() { return this.service.findAll(); }

  @Post()
  @Permissions('role:create')
  @OperationLog({ module: 'admin-user', action: 'create' })
  create(@Body() body: CreateAdminUserDto) { return this.service.create(body); }

  @Patch(':id')
  @Permissions('role:update')
  @OperationLog({ module: 'admin-user', action: 'update' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateAdminUserDto) {
    return this.service.update(id, body);
  }
}
