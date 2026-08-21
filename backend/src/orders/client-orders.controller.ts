import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientOrdersService } from './client-orders.service';
import { CreateClientOrderDto } from './dto/create-client-order.dto';
import { UpdateClientOrderDto } from './dto/update-client-order.dto';
import { CreateOrderFromDesignDto } from './dto/create-order-from-design.dto';
import { UpdateClientOrderStatusDto } from './dto/update-client-order-status.dto';
import { RejectQuoteDto } from './dto/reject-quote.dto';
import { ServiceReviewDto } from './dto/service-review.dto';
import { ClientOrderPhotosDto } from './dto/client-order-photos.dto';
import { ClientOrderRecordNoteDto } from './dto/client-order-record-note.dto';

@Controller('client/orders')
@UseGuards(ClientJwtAuthGuard)
@ApiTags('客户端-订单')
@ApiBearerAuth()
export class ClientOrdersController {
  constructor(private readonly clientOrdersService: ClientOrdersService) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiBody({ type: CreateClientOrderDto })
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientOrderDto,
  ) {
    return this.clientOrdersService.create(request.user.clientUserId, dto);
  }

  @Post('from-design')
  @ApiOperation({ summary: '从设计创建订单' })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiBody({ type: CreateOrderFromDesignDto })
  createFromDesign(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateOrderFromDesignDto,
  ) {
    return this.clientOrdersService.createFromDesign(
      request.user.clientUserId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表' })
  @ApiResponse({ status: 200, description: '返回订单列表' })
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.clientOrdersService.findAll(request.user.clientUserId);
  }

  @Get('trade-orders/list')
  findTradeOrders(
    @Req() request: { user: { clientUserId: number } },
  ) {
    return this.clientOrdersService.findTradeOrders(request.user.clientUserId);
  }

  @Get('trips')
  @ApiOperation({ summary: '获取上门服务行程列表' })
  @ApiResponse({ status: 200, description: '返回行程列表' })
  findTrips(@Req() request: { user: { clientUserId: number } }) {
    return this.clientOrdersService.findTrips(request.user.clientUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiResponse({ status: 200, description: '返回订单详情' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', type: Number, description: '订单ID' })
  findOne(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientOrdersService.findOne(request.user.clientUserId, id);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: '创建或更新已完成服务的评价与照片授权' })
  review(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ServiceReviewDto,
  ) {
    return this.clientOrdersService.saveReview(
      request.user.clientUserId,
      id,
      dto,
    );
  }

  @Patch(':id/client-photos')
  @ApiOperation({ summary: '保存客户在已完成预约中上传的美甲照片' })
  saveClientPhotos(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ClientOrderPhotosDto,
  ) {
    return this.clientOrdersService.saveClientPhotos(
      request.user.clientUserId,
      id,
      dto.photos,
    );
  }

  @Patch(':id/client-record-note')
  @ApiOperation({ summary: '保存客户的已完成美甲记录备注' })
  saveClientRecordNote(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ClientOrderRecordNoteDto,
  ) {
    return this.clientOrdersService.saveClientRecordNote(
      request.user.clientUserId,
      id,
      dto.note,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新订单' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', type: Number, description: '订单ID' })
  @ApiBody({ type: UpdateClientOrderDto })
  update(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientOrderDto,
  ) {
    return this.clientOrdersService.update(request.user.clientUserId, id, dto);
  }

  @Post(':id/agree')
  @ApiOperation({ summary: '同意订单' })
  @ApiResponse({ status: 200, description: '同意成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', type: Number, description: '订单ID' })
  agree(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { fundAmount?: number } = {},
  ) {
    return this.clientOrdersService.agree(
      request.user.clientUserId,
      id,
      Number(body.fundAmount ?? 0),
    );
  }

  @Post(':id/reject-quote')
  @ApiOperation({ summary: '拒绝报价' })
  @ApiResponse({ status: 200, description: '拒绝成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', type: Number, description: '订单ID' })
  @ApiBody({ type: RejectQuoteDto })
  rejectQuote(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectQuoteDto,
  ) {
    return this.clientOrdersService.rejectQuote(
      request.user.clientUserId,
      id,
      dto.reason,
    );
  }

  @Post(':id/reinitiate')
  @ApiOperation({ summary: '重新发起已过期订单' })
  @ApiResponse({ status: 200, description: '重新发起成功' })
  @ApiResponse({ status: 400, description: '当前状态不支持' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', type: Number, description: '订单ID' })
  @ApiBody({
    schema: {
      properties: {
        serviceDate: { type: 'string', description: '预约日期 YYYY-MM-DD' },
        startTime: { type: 'string', description: '预约时间 HH:mm' },
      },
    },
  })
  reinitiate(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { serviceDate: string; startTime: string },
  ) {
    return this.clientOrdersService.reinitiate(
      request.user.clientUserId,
      id,
      dto,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新订单状态' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '无效的状态' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiParam({ name: 'id', type: Number, description: '订单ID' })
  @ApiBody({ type: UpdateClientOrderStatusDto })
  updateStatus(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientOrderStatusDto,
  ) {
    return this.clientOrdersService.updateStatus(
      request.user.clientUserId,
      id,
      dto.status,
    );
  }

  @Get('blocked-slots/:techId')
  @ApiOperation({ summary: '获取美甲师的冻结时间段' })
  @ApiResponse({ status: 200, description: '返回冻结时间段列表' })
  @ApiParam({ name: 'techId', type: Number, description: '美甲师ID' })
  getBlockedSlots(@Param('techId', ParseIntPipe) techId: number) {
    return this.clientOrdersService.getBlockedSlots(techId);
  }
}
