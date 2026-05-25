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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientAddressesService } from './client-addresses.service';
import { CreateClientAddressDto } from './dto/create-client-address.dto';
import { UpdateClientAddressDto } from './dto/update-client-address.dto';

@Controller('client/addresses')
@UseGuards(ClientJwtAuthGuard)
@ApiTags('客户端-地址')
@ApiBearerAuth()
export class ClientAddressesController {
  constructor(
    private readonly clientAddressesService: ClientAddressesService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取地址列表' })
  @ApiResponse({ status: 200, description: '返回地址列表' })
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.clientAddressesService.findAll(request.user.clientUserId);
  }

  @Post()
  @ApiOperation({ summary: '创建地址' })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiBody({ type: CreateClientAddressDto })
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientAddressDto,
  ) {
    return this.clientAddressesService.create(request.user.clientUserId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新地址' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '地址不存在' })
  @ApiParam({ name: 'id', type: Number, description: '地址ID' })
  @ApiBody({ type: UpdateClientAddressDto })
  update(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientAddressDto,
  ) {
    return this.clientAddressesService.update(
      request.user.clientUserId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除地址' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '地址不存在' })
  @ApiParam({ name: 'id', type: Number, description: '地址ID' })
  remove(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientAddressesService.remove(request.user.clientUserId, id);
  }

  @Post(':id/default')
  @ApiOperation({ summary: '设置默认地址' })
  @ApiResponse({ status: 200, description: '设置成功' })
  @ApiResponse({ status: 404, description: '地址不存在' })
  @ApiParam({ name: 'id', type: Number, description: '地址ID' })
  setDefault(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientAddressesService.setDefault(
      request.user.clientUserId,
      id,
    );
  }
}
