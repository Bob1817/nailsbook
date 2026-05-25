import {
  Body,
  Controller,
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
import { CustomServiceRequestsService } from './custom-service-requests.service';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { CreateCustomServiceRequestDto } from './dto/create-custom-service-request.dto';

@Controller('client/custom-service-requests')
@UseGuards(ClientJwtAuthGuard)
@ApiTags('客户端-定制服务')
@ApiBearerAuth()
export class ClientCustomServiceRequestsController {
  constructor(
    private readonly customServiceRequestsService: CustomServiceRequestsService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建定制服务请求' })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  @ApiBody({ type: CreateCustomServiceRequestDto })
  create(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: CreateCustomServiceRequestDto,
  ) {
    return this.customServiceRequestsService.create(
      request.user.clientUserId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: '获取定制服务请求列表' })
  @ApiResponse({ status: 200, description: '返回请求列表' })
  findAll(@Req() request: { user: { clientUserId: number } }) {
    return this.customServiceRequestsService.findAllForClient(
      request.user.clientUserId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取定制服务请求详情' })
  @ApiResponse({ status: 200, description: '返回请求详情' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  @ApiParam({ name: 'id', type: Number, description: '请求ID' })
  findOne(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.findOneForClient(
      request.user.clientUserId,
      id,
    );
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: '接受报价' })
  @ApiResponse({ status: 200, description: '接受成功' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  @ApiParam({ name: 'id', type: Number, description: '请求ID' })
  acceptQuote(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.acceptQuote(
      request.user.clientUserId,
      id,
    );
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: '拒绝报价' })
  @ApiResponse({ status: 200, description: '拒绝成功' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  @ApiParam({ name: 'id', type: Number, description: '请求ID' })
  rejectQuote(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.rejectQuote(
      request.user.clientUserId,
      id,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '取消定制服务请求' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @ApiResponse({ status: 404, description: '请求不存在' })
  @ApiParam({ name: 'id', type: Number, description: '请求ID' })
  cancel(
    @Req() request: { user: { clientUserId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customServiceRequestsService.cancel(
      request.user.clientUserId,
      id,
    );
  }
}
