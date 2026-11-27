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
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { FeedbackService } from './feedback.service';

@ApiTags('客户端-问题反馈')
@ApiBearerAuth()
@Controller('client/feedback')
@UseGuards(ClientJwtAuthGuard)
export class ClientFeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: '我的客服问询与问题反馈列表' })
  findMine(@Req() req: { user: { clientUserId: number } }) {
    return this.service.findMine('client', req.user.clientUserId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读客服回复数量' })
  async unreadCount(@Req() req: { user: { clientUserId: number } }) {
    const count = await this.service.countUnreadReplies('client', req.user.clientUserId);
    return { count };
  }

  @Post('read-all')
  @ApiOperation({ summary: '将所有客服回复标记为已读' })
  markAllRead(@Req() req: { user: { clientUserId: number } }) {
    return this.service.markAllRepliesRead('client', req.user.clientUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: '我的客服问询与问题反馈详情' })
  findMineById(
    @Req() req: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findMineById(id, 'client', req.user.clientUserId);
  }

  @Post()
  @ApiOperation({ summary: '提交客服问询或问题反馈' })
  create(
    @Req() req: { user: { clientUserId: number } },
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
      sourceType: 'client',
      sourceId: req.user.clientUserId,
      title: body.title,
      type: body.type,
      content: body.content,
      attachmentUrls: body.attachmentUrls,
      contactPhone: body.contactPhone,
    });
  }
}
