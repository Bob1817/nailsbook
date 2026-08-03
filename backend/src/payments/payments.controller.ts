import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { OrderPaymentType, PaymentsService } from './payments.service';

@Controller('client/payments')
@UseGuards(ClientJwtAuthGuard)
export class ClientPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:orderId')
  createOrderPayment(
    @Req() request: { user: { clientUserId: number } },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: { paymentType: OrderPaymentType; idempotencyKey: string },
  ) {
    return this.payments.createOrderPayment(
      request.user.clientUserId,
      orderId,
      body.paymentType,
      body.idempotencyKey,
    );
  }

  @Get('orders/:orderId')
  listForOrder(
    @Req() request: { user: { clientUserId: number } },
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.payments.listForOrder(request.user.clientUserId, orderId);
  }
}
