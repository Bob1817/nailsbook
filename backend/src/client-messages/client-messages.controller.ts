import { Body, Controller, Get, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientMessagesService } from './client-messages.service';
import { CreateClientMessageDto } from './dto/create-client-message.dto';

@Controller('client/messages')
@UseGuards(ClientJwtAuthGuard)
export class ClientMessagesController {
  constructor(private readonly clientMessagesService: ClientMessagesService) {}

  @Get('conversations')
  getConversations(
    @Req() request: { user: { clientUserId: number } },
  ) {
    return this.clientMessagesService.getConversations(request.user.clientUserId);
  }

  @Get()
  findAll(
    @Req() request: { user: { clientUserId: number } },
    @Query('conversation_id', ParseIntPipe) conversationId: number,
  ) {
    return this.clientMessagesService.findAll(request.user.clientUserId, conversationId);
  }

  @Post()
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientMessageDto,
  ) {
    return this.clientMessagesService.create(request.user.clientUserId, dto);
  }

  @Patch('read')
  markAsRead(
    @Req() request: { user: { clientUserId: number } },
    @Body('conversation_id', ParseIntPipe) conversationId: number,
  ) {
    return this.clientMessagesService.markAsRead(request.user.clientUserId, conversationId);
  }
}
