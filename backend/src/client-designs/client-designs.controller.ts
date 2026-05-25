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
import { ClientDesignsService } from './client-designs.service';
import { CreateClientDesignDto } from './dto/create-client-design.dto';
import { UpdateClientDesignDto } from './dto/update-client-design.dto';

@Controller('client/designs')
@UseGuards(ClientJwtAuthGuard)
@ApiTags('客户端-设计')
@ApiBearerAuth()
export class ClientDesignsController {
  constructor(private readonly clientDesignsService: ClientDesignsService) {}

  @Post()
  @ApiOperation({ summary: '创建设计' })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiBody({ type: CreateClientDesignDto })
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateClientDesignDto,
  ) {
    return this.clientDesignsService.create(request.user.clientUserId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取设计列表' })
  @ApiResponse({ status: 200, description: '返回设计列表' })
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.clientDesignsService.findAll(request.user.clientUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取设计详情' })
  @ApiResponse({ status: 200, description: '返回设计详情' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiParam({ name: 'id', type: Number, description: '设计ID' })
  findOne(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientDesignsService.findOne(request.user.clientUserId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新设计' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiParam({ name: 'id', type: Number, description: '设计ID' })
  @ApiBody({ type: UpdateClientDesignDto })
  update(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDesignDto,
  ) {
    return this.clientDesignsService.update(request.user.clientUserId, id, dto);
  }

  @Patch(':id/switch-technician')
  @ApiOperation({ summary: '切换设计关联的美甲师' })
  @ApiResponse({ status: 200, description: '切换成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiParam({ name: 'id', type: Number, description: '设计ID' })
  switchTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body('techId', ParseIntPipe) techId: number,
  ) {
    return this.clientDesignsService.switchTechnician(
      request.user.clientUserId,
      id,
      techId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除设计' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiParam({ name: 'id', type: Number, description: '设计ID' })
  remove(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientDesignsService.remove(request.user.clientUserId, id);
  }
}
