import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { AdminOrdersService } from './admin-orders.service';

@ApiTags('管理员-预约')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
export class AdminOrdersController {
  constructor(private readonly service: AdminOrdersService) {}

  @Get()
  @Permissions('booking:view')
  @ApiOperation({ summary: '查询预约列表' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(Number(page) || 1, Number(limit) || 20, status, search);
  }

  @Get(':id')
  @Permissions('booking:view')
  @ApiOperation({ summary: '查询预约及报价明细' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }
}
