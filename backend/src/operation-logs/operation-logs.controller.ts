import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OperationLogsService } from './operation-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';

@ApiTags('管理员-操作日志')
@ApiBearerAuth()
@Controller('admin/operation-logs')
@UseGuards(JwtAuthGuard)
export class OperationLogsController {
  constructor(private readonly operationLogsService: OperationLogsService) {}

  @Get()
  @Permissions('log:view')
  @ApiOperation({ summary: '获取操作日志列表' })
  @ApiQuery({
    name: 'page',
    type: String,
    description: '页码',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: String,
    description: '每页数量',
    required: false,
  })
  @ApiQuery({
    name: 'adminUserId',
    type: String,
    description: '管理员用户ID',
    required: false,
  })
  @ApiQuery({
    name: 'module',
    type: String,
    description: '模块名称',
    required: false,
  })
  @ApiQuery({
    name: 'action',
    type: String,
    description: '操作类型',
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    description: '开始日期',
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    description: '结束日期',
    required: false,
  })
  @ApiResponse({ status: 200, description: '返回操作日志列表' })
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
  @ApiOperation({ summary: '获取所有模块名称' })
  @ApiResponse({ status: 200, description: '返回模块名称列表' })
  getModules() {
    return this.operationLogsService.getModules();
  }

  @Get('actions')
  @Permissions('log:view')
  @ApiOperation({ summary: '获取指定模块的操作类型' })
  @ApiQuery({
    name: 'module',
    type: String,
    description: '模块名称',
    required: false,
  })
  @ApiResponse({ status: 200, description: '返回操作类型列表' })
  getActions(@Query('module') module?: string) {
    return this.operationLogsService.getActions(module);
  }

  @Get(':id')
  @Permissions('log:view')
  @ApiOperation({ summary: '获取操作日志详情' })
  @ApiParam({ name: 'id', type: String, description: '日志ID' })
  @ApiResponse({ status: 200, description: '返回日志详情' })
  @ApiResponse({ status: 404, description: '日志不存在' })
  findOne(@Param('id') id: string) {
    return this.operationLogsService.findOne(parseInt(id, 10));
  }
}
