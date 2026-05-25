import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RevenuesService } from './revenues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';

@ApiTags('管理员-收入')
@ApiBearerAuth()
@Controller('admin/revenues')
@UseGuards(JwtAuthGuard)
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Get('export')
  @Permissions('revenue.view')
  @ApiOperation({ summary: '导出收入CSV' })
  @ApiQuery({
    name: 'technicianId',
    type: String,
    description: '美甲师ID',
    required: false,
  })
  @ApiQuery({
    name: 'customerId',
    type: String,
    description: '客户ID',
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
  @ApiResponse({ status: 200, description: '返回CSV文件' })
  async exportCsv(
    @Res() res: Response,
    @Query('technicianId') technicianId?: string,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.revenuesService.exportCsv(
      technicianId ? parseInt(technicianId, 10) : undefined,
      customerId ? parseInt(customerId, 10) : undefined,
      startDate,
      endDate,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=revenues.csv');
    res.send('﻿' + csv);
  }

  @Get()
  @Permissions('revenue.view')
  @ApiOperation({ summary: '获取收入记录列表' })
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
    name: 'technicianId',
    type: String,
    description: '美甲师ID',
    required: false,
  })
  @ApiQuery({
    name: 'customerId',
    type: String,
    description: '客户ID',
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
  @ApiResponse({ status: 200, description: '返回收入记录列表' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('technicianId') technicianId?: string,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.revenuesService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      technicianId ? parseInt(technicianId, 10) : undefined,
      customerId ? parseInt(customerId, 10) : undefined,
      startDate,
      endDate,
    );
  }

  @Get('statistics')
  @Permissions('revenue.view')
  @ApiOperation({ summary: '获取收入统计' })
  @ApiQuery({
    name: 'technicianId',
    type: String,
    description: '美甲师ID',
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
  @ApiResponse({ status: 200, description: '返回统计数据' })
  getStatistics(
    @Query('technicianId') technicianId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.revenuesService.getStatistics(
      technicianId ? parseInt(technicianId, 10) : undefined,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @Permissions('revenue.view')
  @ApiOperation({ summary: '获取收入记录详情' })
  @ApiParam({ name: 'id', type: String, description: '收入记录ID' })
  @ApiResponse({ status: 200, description: '返回收入记录详情' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  findOne(@Param('id') id: string) {
    return this.revenuesService.findOne(parseInt(id, 10));
  }
}
