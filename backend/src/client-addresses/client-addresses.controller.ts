import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientAddressesService } from './client-addresses.service';
import { CreateClientAddressDto } from './dto/create-client-address.dto';
import { UpdateClientAddressDto } from './dto/update-client-address.dto';

@Controller('client/addresses')
@UseGuards(ClientJwtAuthGuard)
export class ClientAddressesController {
  constructor(private readonly clientAddressesService: ClientAddressesService) {}

  @Get()
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.clientAddressesService.findAll(request.user.clientUserId);
  }

  @Post()
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientAddressDto,
  ) {
    return this.clientAddressesService.create(request.user.clientUserId, dto);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientAddressDto,
  ) {
    return this.clientAddressesService.update(request.user.clientUserId, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientAddressesService.remove(request.user.clientUserId, id);
  }

  @Post(':id/default')
  setDefault(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientAddressesService.setDefault(request.user.clientUserId, id);
  }
}
