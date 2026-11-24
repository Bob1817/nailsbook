import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { FeedbackService } from './feedback.service';

@ApiTags('技师端-问题反馈')
@ApiBearerAuth()
@Controller('technician/feedback')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianFeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: '我的客服问询与问题反馈列表' })
  findMine(@Req() req: { user: { technicianId: number } }) {
    return this.service.findMine('technician', req.user.technicianId);
  }

  @Get(':id')
  @ApiOperation({ summary: '我的客服问询与问题反馈详情' })
  findMineById(
    @Req() req: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findMineById(id, 'technician', req.user.technicianId);
  }

  @Post()
  @ApiOperation({ summary: '提交客服问询或问题反馈' })
  create(
    @Req() req: { user: { technicianId: number } },
    @Body()
    body: {
      title: string;
      type: string;
      content: string;
      attachmentUrls?: string[];
      contactPhone?: string;
    },
  ) {
    return this.service.create({
      sourceType: 'technician',
      sourceId: req.user.technicianId,
      title: body.title,
      type: body.type,
      content: body.content,
      attachmentUrls: body.attachmentUrls,
      contactPhone: body.contactPhone,
    });
  }
}
