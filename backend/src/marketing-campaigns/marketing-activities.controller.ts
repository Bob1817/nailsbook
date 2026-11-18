import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import {
  CreateActivityDto,
  SetHeroRecommendationDto,
  UpdateActivityDto,
} from './dto/activity.dto';
import { MarketingCampaignsService } from './marketing-campaigns.service';

@Controller('technician/activities')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class MarketingActivitiesController {
  constructor(private readonly service: MarketingCampaignsService) {}

  @Get()
  list(
    @Req() req: { user: { technicianId: number } },
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listActivities(req.user.technicianId, {
      status,
      page,
      limit,
    });
  }

  @Get(':id')
  detail(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getActivity(req.user.technicianId, id);
  }

  @Post()
  create(
    @Req() req: { user: { technicianId: number } },
    @Body() body: CreateActivityDto,
  ) {
    return this.service.createActivity(req.user.technicianId, body);
  }

  @Put(':id')
  update(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateActivityDto,
  ) {
    return this.service.updateActivity(req.user.technicianId, id, body);
  }

  @Put(':id/hero-recommendation')
  setHero(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetHeroRecommendationDto,
  ) {
    return this.service.setHeroRecommendation(req.user.technicianId, id, body);
  }

  @Post(':id/copy')
  copy(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.copyActivity(req.user.technicianId, id);
  }

  @Delete(':id')
  delete(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteActivity(req.user.technicianId, id);
  }
}
