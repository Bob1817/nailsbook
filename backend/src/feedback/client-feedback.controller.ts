import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { FeedbackService } from './feedback.service';

@ApiTags('客户端-问题反馈')
@ApiBearerAuth()
@Controller('client/feedback')
@UseGuards(ClientJwtAuthGuard)
export class ClientFeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: '提交问题反馈' })
  create(
    @Req() req: { user: { clientUserId: number } },
    @Body() body: { title: string; type: string; content: string },
  ) {
    return this.service.create({
      sourceType: 'client',
      sourceId: req.user.clientUserId,
      title: body.title,
      type: body.type,
      content: body.content,
    });
  }
}
