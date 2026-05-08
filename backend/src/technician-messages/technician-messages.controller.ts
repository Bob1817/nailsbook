import { Body, Controller, Get, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TechnicianMessagesService } from './technician-messages.service';
import { CreateTechnicianMessageDto } from './dto/create-technician-message.dto';

@Controller('technician/messages')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianMessagesController {
  constructor(private readonly technicianMessagesService: TechnicianMessagesService) {}

  @Get('conversations')
  getConversations(
    @Req() request: { user: { technicianId: number } },
  ) {
    return this.technicianMessagesService.getConversations(request.user.technicianId);
  }

  @Get()
  findAll(
    @Req() request: { user: { technicianId: number } },
    @Query('conversation_id', ParseIntPipe) conversationId: number,
  ) {
    return this.technicianMessagesService.findAll(request.user.technicianId, conversationId);
  }

  @Post()
  create(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: CreateTechnicianMessageDto,
  ) {
    return this.technicianMessagesService.create(request.user.technicianId, dto);
  }

  @Patch('read')
  markAsRead(
    @Req() request: { user: { technicianId: number } },
    @Body('conversation_id', ParseIntPipe) conversationId: number,
  ) {
    return this.technicianMessagesService.markAsRead(request.user.technicianId, conversationId);
  }
}
