import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { TechnicianInsightsService } from './technician-insights.service';

@ApiTags('美甲师-经营分析')
@ApiBearerAuth()
@Controller('technician/insights')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianInsightsController {
  constructor(
    private readonly technicianInsightsService: TechnicianInsightsService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: '获取美甲师经营概览' })
  @ApiResponse({ status: 200, description: '返回统一口径的经营指标' })
  getOverview(@Req() request: { user: { technicianId: number } }) {
    return this.technicianInsightsService.getOverview(
      request.user.technicianId,
    );
  }
}
