import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { CreateTechnicianOrderDto } from './dto/create-technician-order.dto';
import { ReviewOrderDto } from './dto/review-order.dto';
import { UpdateTechnicianOrderDto } from './dto/update-technician-order.dto';
import { CompleteServiceDto } from './dto/complete-service.dto';

@ApiTags('美甲师-订单')
@ApiBearerAuth()
@Controller('technician/orders')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('trade-orders/list')
  findTradeOrders(
    @Req() request: { user: { technicianId: number } },
    @Query('status') status?: string,
  ) {
    return this.ordersService.findTradeOrders(request.user.technicianId, status);
  }

  @Post()
  @ApiOperation({ summary: '创建订单' })
  @ApiBody({ type: CreateTechnicianOrderDto })
  @ApiResponse({ status: 200, description: '订单创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 401, description: '未授权' })
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() body: CreateTechnicianOrderDto,
  ) {
    return this.ordersService.createForTechnician(
      request.user.technicianId,
      body,
    );
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表' })
  @ApiQuery({
    name: 'status',
    type: String,
    description: '订单状态筛选',
    required: false,
  })
  @ApiQuery({
    name: 'customerId',
    type: String,
    description: '客户ID筛选',
    required: false,
  })
  @ApiResponse({ status: 200, description: '返回订单列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  findAll(
    @Req() request: { user: { technicianId: number } },
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.ordersService.findAll(
      1,
      100,
      request.user.technicianId,
      customerId ? parseInt(customerId, 10) : undefined,
      status,
    );
  }

  @Get('trips')
  @ApiOperation({ summary: '获取出行列表' })
  @ApiResponse({ status: 200, description: '返回出行列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  findTrips(@Req() request: { user: { technicianId: number } }) {
    return this.ordersService.findTrips(request.user.technicianId);
  }

  @Get('income-calendar')
  @ApiOperation({ summary: '获取注册以来的收入日历数据' })
  @ApiResponse({ status: 200, description: '返回注册时间与轻量订单收入字段' })
  @ApiResponse({ status: 401, description: '未授权' })
  findIncomeCalendar(@Req() request: { user: { technicianId: number } }) {
    return this.ordersService.findIncomeCalendar(request.user.technicianId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiParam({ name: 'id', type: String, description: '订单ID' })
  @ApiResponse({ status: 200, description: '返回订单详情' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  findOne(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
  ) {
    return this.ordersService.findOneForTechnician(
      parseInt(id, 10),
      request.user.technicianId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新订单信息' })
  @ApiParam({ name: 'id', type: String, description: '订单ID' })
  @ApiBody({ type: UpdateTechnicianOrderDto })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async update(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: UpdateTechnicianOrderDto,
  ) {
    return this.ordersService.updateForTechnician(
      parseInt(id, 10),
      request.user.technicianId,
      body,
    );
  }

  @Patch(':id/review')
  @ApiOperation({ summary: '审核订单' })
  @ApiParam({ name: 'id', type: String, description: '订单ID' })
  @ApiBody({ type: ReviewOrderDto })
  @ApiResponse({ status: 200, description: '审核成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async review(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: ReviewOrderDto,
  ) {
    await this.ordersService.findOneForTechnician(
      parseInt(id, 10),
      request.user.technicianId,
    );
    return this.ordersService.review(
      parseInt(id, 10),
      request.user.technicianId,
      body,
    );
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: '确认订单' })
  @ApiParam({ name: 'id', type: String, description: '订单ID' })
  @ApiResponse({ status: 200, description: '确认成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async confirm(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
  ) {
    await this.ordersService.findOneForTechnician(
      parseInt(id, 10),
      request.user.technicianId,
    );
    return this.ordersService.confirm(parseInt(id, 10));
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: '完成订单' })
  @ApiParam({ name: 'id', type: String, description: '订单ID' })
  @ApiResponse({ status: 200, description: '订单已完成' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async complete(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: CompleteServiceDto,
  ) {
    await this.ordersService.findOneForTechnician(
      parseInt(id, 10),
      request.user.technicianId,
    );
    const hasRecordFields = Boolean(
      body &&
        (body.actualStartTime ||
          body.actualEndTime ||
          body.actualAmount != null ||
          body.materialCost != null),
    );
    return this.ordersService.complete(
      parseInt(id, 10),
      hasRecordFields ? body : undefined,
    );
  }

  @Patch(':id/reinitiate')
  @ApiOperation({ summary: '重新发起已过期订单' })
  @ApiParam({ name: 'id', type: String, description: '订单ID' })
  @ApiBody({
    schema: {
      properties: {
        serviceDate: { type: 'string', description: '预约日期 YYYY-MM-DD' },
        startTime: { type: 'string', description: '预约时间 HH:mm' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '重新发起成功' })
  @ApiResponse({ status: 400, description: '当前状态不支持' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async reinitiate(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: { serviceDate: string; startTime: string },
  ) {
    return this.ordersService.reinitiate(
      parseInt(id, 10),
      request.user.technicianId,
      body,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  @ApiParam({ name: 'id', type: String, description: '订单ID' })
  @ApiResponse({ status: 200, description: '订单已取消' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async cancel(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
  ) {
    await this.ordersService.findOneForTechnician(
      parseInt(id, 10),
      request.user.technicianId,
    );
    return this.ordersService.cancel(parseInt(id, 10));
  }
}
