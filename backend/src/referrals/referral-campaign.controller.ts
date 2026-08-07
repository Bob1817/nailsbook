import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { UpsertReferralCampaignDto } from './dto/upsert-referral-campaign.dto';
import { ReferralCampaignService } from './referral-campaign.service';

@ApiTags('美甲师-推荐活动')
@ApiBearerAuth()
@Controller('technician/referral-campaign')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class ReferralCampaignController {
  constructor(private readonly service: ReferralCampaignService) {}

  @Get()
  @ApiOperation({ summary: '获取推荐活动配置和奖励承诺状态' })
  get(@Req() request: { user: { technicianId: number } }) {
    return this.service.getForTechnician(request.user.technicianId);
  }

  @Put()
  @ApiOperation({ summary: '创建或更新推荐活动配置' })
  upsert(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpsertReferralCampaignDto,
  ) {
    return this.service.upsertForTechnician(
      request.user.technicianId,
      body,
    );
  }
}
