import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientDesignsService } from './client-designs.service';
import { CreateClientDesignDto } from './dto/create-client-design.dto';
import { UpdateClientDesignDto } from './dto/update-client-design.dto';

@Controller('client/designs')
@UseGuards(ClientJwtAuthGuard)
export class ClientDesignsController {
  constructor(private readonly clientDesignsService: ClientDesignsService) {}

  @Post()
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientDesignDto,
  ) {
    return this.clientDesignsService.create(request.user.clientUserId, dto);
  }

  @Get()
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.clientDesignsService.findAll(request.user.clientUserId);
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientDesignsService.findOne(request.user.clientUserId, id);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDesignDto,
  ) {
    return this.clientDesignsService.update(request.user.clientUserId, id, dto);
  }

  @Patch(':id/switch-technician')
  switchTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body('techId', ParseIntPipe) techId: number,
  ) {
    return this.clientDesignsService.switchTechnician(request.user.clientUserId, id, techId);
  }

  @Delete(':id')
  remove(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientDesignsService.remove(request.user.clientUserId, id);
  }
}
