import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OperationLogsService } from './operation-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';

@Controller('admin/operation-logs')
@UseGuards(JwtAuthGuard)
export class OperationLogsController {
  constructor(private readonly operationLogsService: OperationLogsService) {}

  @Get()
  @Permissions('log:view')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.operationLogsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      adminUserId ? parseInt(adminUserId, 10) : undefined,
      module,
      action,
      startDate,
      endDate,
    );
  }

  @Get('modules')
  @Permissions('log:view')
  getModules() {
    return this.operationLogsService.getModules();
  }

  @Get('actions')
  @Permissions('log:view')
  getActions(@Query('module') module?: string) {
    return this.operationLogsService.getActions(module);
  }

  @Get(':id')
  @Permissions('log:view')
  findOne(@Param('id') id: string) {
    return this.operationLogsService.findOne(parseInt(id, 10));
  }
}
