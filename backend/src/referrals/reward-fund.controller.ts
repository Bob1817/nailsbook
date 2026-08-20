import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { RewardFundService } from './reward-fund.service';
import {
  assertMiniProgramFeatureDisabled,
  isMiniProgramLaunchMode,
} from '../common/miniprogram-launch-mode';

@ApiTags('客户端-美甲基金')
@ApiBearerAuth()
@Controller('client/reward-funds')
@UseGuards(ClientJwtAuthGuard)
export class ClientRewardFundController {
  constructor(private readonly service: RewardFundService) {}

  @Get()
  get(@Req() request: { user: { clientUserId: number } }) {
    if (isMiniProgramLaunchMode()) {
      assertMiniProgramFeatureDisabled('美甲基金');
    }
    return this.service.getForClient(request.user.clientUserId);
  }
}

@ApiTags('美甲师-美甲基金')
@ApiBearerAuth()
@Controller('technician/reward-funds')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianRewardFundController {
  constructor(private readonly service: RewardFundService) {}

  @Get('summary')
  get(@Req() request: { user: { technicianId: number } }) {
    if (isMiniProgramLaunchMode()) {
      assertMiniProgramFeatureDisabled('美甲基金');
    }
    return this.service.getForTechnician(request.user.technicianId);
  }
}
