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
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';
import { MarketingCampaignsService } from './marketing-campaigns.service';

@Controller('technician/notices')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class MarketingNoticesController {
  constructor(private readonly service: MarketingCampaignsService) {}

  @Get('coverage-count')
  getCoverageCount(@Req() req: { user: { technicianId: number } }) {
    return this.service.getNoticeCoverageCount(req.user.technicianId);
  }

  @Get()
  list(
    @Req() req: { user: { technicianId: number } },
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listNotices(req.user.technicianId, {
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
    return this.service.getNotice(req.user.technicianId, id);
  }

  @Post()
  create(
    @Req() req: { user: { technicianId: number } },
    @Body() body: CreateNoticeDto,
  ) {
    return this.service.createNotice(req.user.technicianId, body);
  }

  @Put(':id')
  update(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateNoticeDto,
  ) {
    return this.service.updateNotice(req.user.technicianId, id, body);
  }

  @Delete(':id')
  delete(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteNotice(req.user.technicianId, id);
  }
}
