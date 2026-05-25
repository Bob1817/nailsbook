import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';

@ApiTags('管理员-仪表盘')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Permissions('dashboard:view')
  @ApiOperation({ summary: '获取总览数据' })
  @ApiResponse({ status: 200, description: '返回仪表盘总览数据' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('business-stats')
  @Permissions('dashboard:view')
  @ApiOperation({ summary: '获取业务统计' })
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
  @ApiResponse({ status: 200, description: '返回业务统计数据' })
  getBusinessStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getBusinessStats(startDate, endDate);
  }
}
