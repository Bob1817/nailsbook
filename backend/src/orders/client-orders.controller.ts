import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientOrdersService } from './client-orders.service';
import { CreateClientOrderDto } from './dto/create-client-order.dto';
import { UpdateClientOrderDto } from './dto/update-client-order.dto';
import { CreateOrderFromDesignDto } from './dto/create-order-from-design.dto';
import { UpdateClientOrderStatusDto } from './dto/update-client-order-status.dto';
import { RejectQuoteDto } from './dto/reject-quote.dto';

@Controller('client/orders')
@UseGuards(ClientJwtAuthGuard)
export class ClientOrdersController {
  constructor(private readonly clientOrdersService: ClientOrdersService) {}

  @Post()
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientOrderDto,
  ) {
    return this.clientOrdersService.create(request.user.clientUserId, dto);
  }

  @Post('from-design')
  createFromDesign(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateOrderFromDesignDto,
  ) {
    return this.clientOrdersService.createFromDesign(request.user.clientUserId, dto);
  }

  @Get()
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.clientOrdersService.findAll(request.user.clientUserId);
  }

  @Get('trips')
  findTrips(@Req() request: { user: { clientUserId: number } }) {
    return this.clientOrdersService.findTrips(request.user.clientUserId);
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientOrdersService.findOne(request.user.clientUserId, id);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientOrderDto,
  ) {
    return this.clientOrdersService.update(request.user.clientUserId, id, dto);
  }

  @Post(':id/agree')
  agree(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientOrdersService.agree(request.user.clientUserId, id);
  }

  @Post(':id/reject-quote')
  rejectQuote(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectQuoteDto,
  ) {
    return this.clientOrdersService.rejectQuote(request.user.clientUserId, id, dto.reason);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientOrderStatusDto,
  ) {
    return this.clientOrdersService.updateStatus(request.user.clientUserId, id, dto.status);
  }
}
