import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientMessagesService } from './client-messages.service';
import { CreateClientMessageDto } from './dto/create-client-message.dto';

@Controller('client/messages')
@UseGuards(ClientJwtAuthGuard)
@ApiTags('客户端-消息')
@ApiBearerAuth()
export class ClientMessagesController {
  constructor(private readonly clientMessagesService: ClientMessagesService) {}

  @Get('conversations')
  @ApiOperation({ summary: '获取会话列表' })
  @ApiResponse({ status: 200, description: '返回会话列表' })
  getConversations(@Req() request: { user: { clientUserId: number } }) {
    return this.clientMessagesService.getConversations(
      request.user.clientUserId,
    );
  }

  @Get()
  @ApiOperation({ summary: '获取消息列表' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  @ApiQuery({ name: 'conversation_id', type: Number, description: '会话ID' })
  findAll(
    @Req() request: { user: { clientUserId: number } },
    @Query('conversation_id', ParseIntPipe) conversationId: number,
  ) {
    return this.clientMessagesService.findAll(
      request.user.clientUserId,
      conversationId,
    );
  }

  @Post()
  @ApiOperation({ summary: '发送消息' })
  @ApiResponse({ status: 200, description: '发送成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiBody({ type: CreateClientMessageDto })
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientMessageDto,
  ) {
    return this.clientMessagesService.create(request.user.clientUserId, dto);
  }

  @Patch('read')
  @ApiOperation({ summary: '标记消息已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'number', description: '会话ID' },
      },
      required: ['conversation_id'],
    },
  })
  markAsRead(
    @Req() request: { user: { clientUserId: number } },
    @Body('conversation_id', ParseIntPipe) conversationId: number,
  ) {
    return this.clientMessagesService.markAsRead(
      request.user.clientUserId,
      conversationId,
    );
  }
}
