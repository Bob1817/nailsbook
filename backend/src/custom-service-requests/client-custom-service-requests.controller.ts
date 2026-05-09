import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CustomServiceRequestsService } from './custom-service-requests.service';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { CreateCustomServiceRequestDto } from './dto/create-custom-service-request.dto';

@Controller('client/custom-service-requests')
@UseGuards(ClientJwtAuthGuard)
export class ClientCustomServiceRequestsController {
  constructor(private readonly customServiceRequestsService: CustomServiceRequestsService) {}

  @Post()
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateCustomServiceRequestDto,
  ) {
    return this.customServiceRequestsService.create(request.user.clientUserId, dto);
  }

  @Get()
  findAll(
    @Req() request: { user: { clientUserId: number } },
  ) {
    return this.customServiceRequestsService.findAllForClient(request.user.clientUserId);
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.findOneForClient(request.user.clientUserId, id);
  }

  @Patch(':id/accept')
  acceptQuote(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.acceptQuote(request.user.clientUserId, id);
  }

  @Patch(':id/reject')
  rejectQuote(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.rejectQuote(request.user.clientUserId, id);
  }

  @Patch(':id/cancel')
  cancel(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.cancel(request.user.clientUserId, id);
  }
}
