import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { WechatSubscribeMessagesService } from './wechat-subscribe-messages.service';

type Decisions = { decisions: Record<string, string> };

@Controller('client/wechat-subscriptions')
@UseGuards(ClientJwtAuthGuard)
export class ClientWechatSubscribeController {
  constructor(private readonly service: WechatSubscribeMessagesService) {}

  @Post('authorization')
  record(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: Decisions,
  ) {
    return this.service.recordAuthorization(
      'client',
      request.user.clientUserId,
      body.decisions,
    );
  }
}

@Controller('technician/wechat-subscriptions')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianWechatSubscribeController {
  constructor(private readonly service: WechatSubscribeMessagesService) {}

  @Post('authorization')
  record(
    @Req() request: { user: { technicianId: number } },
    @Body() body: Decisions,
  ) {
    return this.service.recordAuthorization(
      'technician',
      request.user.technicianId,
      body.decisions,
    );
  }
}
