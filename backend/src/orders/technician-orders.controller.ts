import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { CreateTechnicianOrderDto } from './dto/create-technician-order.dto';
import { ReviewOrderDto } from './dto/review-order.dto';

@Controller('technician/orders')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() body: CreateTechnicianOrderDto,
  ) {
    return this.ordersService.createForTechnician(request.user.technicianId, body);
  }

  @Get()
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
  findTrips(@Req() request: { user: { technicianId: number } }) {
    return this.ordersService.findTrips(request.user.technicianId);
  }

  @Get(':id')
  findOne(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    return this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
  }

  @Patch(':id/review')
  async review(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: ReviewOrderDto,
  ) {
    await this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.ordersService.review(parseInt(id, 10), request.user.technicianId, body);
  }

  @Patch(':id/confirm')
  async confirm(
    @Req() request: { user: { technicianId: number } },
    @Param('id') id: string,
    @Body() body: { depositConfirmed?: boolean },
  ) {
    await this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.ordersService.confirm(parseInt(id, 10), body?.depositConfirmed);
  }

  @Patch(':id/complete')
  async complete(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    await this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.ordersService.complete(parseInt(id, 10));
  }

  @Patch(':id/cancel')
  async cancel(@Req() request: { user: { technicianId: number } }, @Param('id') id: string) {
    await this.ordersService.findOneForTechnician(parseInt(id, 10), request.user.technicianId);
    return this.ordersService.cancel(parseInt(id, 10));
  }
}
