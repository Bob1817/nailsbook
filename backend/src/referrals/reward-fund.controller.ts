import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { RewardFundService } from './reward-fund.service';

@ApiTags('客户端-美甲基金')
@ApiBearerAuth()
@Controller('client/reward-funds')
@UseGuards(ClientJwtAuthGuard)
export class ClientRewardFundController {
  constructor(private readonly service: RewardFundService) {}

  @Get()
  get(@Req() request: { user: { clientUserId: number } }) {
    return this.service.getForClient(request.user.clientUserId);
  }
}

@ApiTags('美甲师-美甲基金')
@ApiBearerAuth()
@Controller('technician/reward-funds')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianRewardFundController {
  constructor(private readonly service: RewardFundService) {}

  @Get('summary')
  get(@Req() request: { user: { technicianId: number } }) {
    return this.service.getForTechnician(request.user.technicianId);
  }
}
