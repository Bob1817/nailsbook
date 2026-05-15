import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { AdminRolesService } from './admin-roles.service';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard)
export class AdminRolesController {
  constructor(private readonly service: AdminRolesService) {}

  @Get()
  @Permissions('role:view')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Permissions('role:view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('role:create')
  @OperationLog({ module: 'role', action: 'create' })
  create(@Body() body: { name: string; code: string; description?: string; permissionIds?: number[] }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @Permissions('role:update')
  @OperationLog({ module: 'role', action: 'update' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string; permissionIds?: number[] },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Permissions('role:delete')
  @OperationLog({ module: 'role', action: 'delete' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
