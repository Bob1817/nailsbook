import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
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
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('管理员-收入')
@ApiBearerAuth()
@Controller('admin/revenues')
@UseGuards(JwtAuthGuard)
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Get('export')
  @Permissions('revenue:view')
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
  @Permissions('revenue:view')
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
  @Permissions('revenue:view')
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
  @Permissions('revenue:view')
  @ApiOperation({ summary: '获取收入记录详情' })
  @ApiParam({ name: 'id', type: String, description: '收入记录ID' })
  @ApiResponse({ status: 200, description: '返回收入记录详情' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  findOne(@Param('id') id: string) {
    return this.revenuesService.findOne(parseInt(id, 10));
  }
}

@ApiTags('美甲师-数据导出')
@ApiBearerAuth()
@Controller('technician/revenues')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianRevenuesController {
  constructor(
    private readonly revenuesService: RevenuesService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get('export/full')
  @ApiOperation({ summary: '导出本人完整经营数据 JSON' })
  async exportFull(
    @Req() request: { user: { technicianId: number } },
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const technicianId = request.user.technicianId;
    await this.subscriptions.assertFeature(technicianId, 'full_export');
    const result = await this.revenuesService.exportFullBusinessData(
      technicianId,
      startDate,
      endDate,
    );
    await this.revenuesService.recordFullExportAudit(
      technicianId,
      result.counts,
      result.filters,
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=full-business-data.json',
    );
    res.send(JSON.stringify(result, null, 2));
  }

  @Get('export')
  @ApiOperation({ summary: '按套餐权限导出本人的收入 CSV' })
  async exportCsv(
    @Req() request: { user: { technicianId: number } },
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const technicianId = request.user.technicianId;
    await this.subscriptions.assertAnyFeature(technicianId, [
      'basic_export',
      'full_export',
    ]);
    const csv = await this.revenuesService.exportCsv(
      technicianId,
      undefined,
      startDate,
      endDate,
    );
    await this.revenuesService.recordExportAudit(technicianId, csv, {
      startDate,
      endDate,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=business-revenues.csv',
    );
    res.send('﻿' + csv);
  }
}
