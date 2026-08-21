import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post()
  @ApiOperation({ summary: '提交问题反馈' })
  create(
    @Req() req: { user: { technicianId: number } },
    @Body()
    body: {
      title: string;
      type: string;
      content: string;
      attachmentUrls?: string[];
    },
  ) {
    return this.service.create({
      sourceType: 'technician',
      sourceId: req.user.technicianId,
      title: body.title,
      type: body.type,
      content: body.content,
      attachmentUrls: body.attachmentUrls,
    });
  }
}
