import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RevenuesService } from './revenues.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';

@Controller('admin/revenues')
@UseGuards(JwtAuthGuard)
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Get('export')
  @Permissions('revenue.view')
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

  @Get(':id')
  @Permissions('revenue.view')
  findOne(@Param('id') id: string) {
    return this.revenuesService.findOne(parseInt(id, 10));
  }

  @Get('statistics')
  @Permissions('revenue.view')
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
}
