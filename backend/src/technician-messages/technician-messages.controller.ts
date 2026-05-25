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
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TechnicianMessagesService } from './technician-messages.service';
import { CreateTechnicianMessageDto } from './dto/create-technician-message.dto';

@ApiTags('美甲师-消息')
@ApiBearerAuth()
@Controller('technician/messages')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianMessagesController {
  constructor(
    private readonly technicianMessagesService: TechnicianMessagesService,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: '获取会话列表' })
  @ApiResponse({ status: 200, description: '返回会话列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  getConversations(@Req() request: { user: { technicianId: number } }) {
    return this.technicianMessagesService.getConversations(
      request.user.technicianId,
    );
  }

  @Get()
  @ApiOperation({ summary: '获取消息列表' })
  @ApiQuery({ name: 'conversation_id', type: Number, description: '会话ID' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  @ApiResponse({ status: 401, description: '未授权' })
  findAll(
    @Req() request: { user: { technicianId: number } },
    @Query('conversation_id', ParseIntPipe) conversationId: number,
  ) {
    return this.technicianMessagesService.findAll(
      request.user.technicianId,
      conversationId,
    );
  }

  @Post()
  @ApiOperation({ summary: '发送消息' })
  @ApiBody({ type: CreateTechnicianMessageDto })
  @ApiResponse({ status: 200, description: '消息发送成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiResponse({ status: 401, description: '未授权' })
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: CreateTechnicianMessageDto,
  ) {
    return this.technicianMessagesService.create(
      request.user.technicianId,
      dto,
    );
  }

  @Patch('read')
  @ApiOperation({ summary: '标记消息已读' })
  @ApiBody({
    schema: {
      properties: {
        conversation_id: { type: 'number', description: '会话ID' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '标记成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  markAsRead(
    @Req() request: { user: { technicianId: number } },
    @Body('conversation_id', ParseIntPipe) conversationId: number,
  ) {
    return this.technicianMessagesService.markAsRead(
      request.user.technicianId,
      conversationId,
    );
  }
}
