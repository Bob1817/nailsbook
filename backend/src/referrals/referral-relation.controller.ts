import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { ReferralRelationService } from './referral-relation.service';

@ApiTags('公开-推荐关系')
@Controller('public/referrals')
export class PublicReferralController {
  constructor(private readonly service: ReferralRelationService) {}

  @Get(':token')
  @ApiOperation({ summary: '安全解析推荐链接（不返回推荐人身份）' })
  resolve(@Param('token') token: string) {
    return this.service.resolve(token);
  }
}

@ApiTags('客户端-推荐关系')
@ApiBearerAuth()
@Controller('client/referrals')
@UseGuards(ClientJwtAuthGuard)
export class ClientReferralController {
  constructor(private readonly service: ReferralRelationService) {}

  @Post('link')
  createLink(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: { technicianId?: number },
  ) {
    return this.service.createLink(request.user.clientUserId, body.technicianId);
  }

  @Post('claim')
  claim(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: { token: string },
  ) {
    return this.service.claim(request.user.clientUserId, body.token);
  }

  @Get()
  list(@Req() request: { user: { clientUserId: number } }) {
    return this.service.listForClient(request.user.clientUserId);
  }
}

@ApiTags('美甲师-推荐关系')
@ApiBearerAuth()
@Controller('technician/referrals')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianReferralController {
  constructor(private readonly service: ReferralRelationService) {}

  @Get()
  list(@Req() request: { user: { technicianId: number } }) {
    return this.service.listForTechnician(request.user.technicianId);
  }
}
