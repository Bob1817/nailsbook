import {
  Body,
  Controller,
  Get,
  Param,
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
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ArtistApplicationsService } from './artist-applications.service';
import { CreateArtistApplicationDto } from './dto/create-artist-application.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';

@ApiTags('管理员-艺术家申请')
@ApiBearerAuth()
@Controller()
export class ArtistApplicationsController {
  constructor(private readonly service: ArtistApplicationsService) {}

  @Post('artist-applications')
  @ApiOperation({ summary: '提交艺术家申请（公开）' })
  @ApiBody({ type: CreateArtistApplicationDto })
  @ApiResponse({ status: 201, description: '申请提交成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  create(@Body() dto: CreateArtistApplicationDto) {
    return this.service.create(dto);
  }

  @Get('artist-applications/check-phone')
  @ApiOperation({ summary: '检查手机号申请状态（公开）' })
  @ApiQuery({ name: 'phone', type: String, description: '手机号', required: true })
  @ApiResponse({ status: 200, description: '返回手机号申请状态' })
  checkPhone(@Query('phone') phone: string) {
    return this.service.checkPhone(phone);
  }

  @Get('admin/artist-applications')
  @UseGuards(JwtAuthGuard)
  @Permissions('application:view')
  @ApiOperation({ summary: '获取艺术家申请列表' })
  @ApiQuery({
    name: 'page',
    type: String,
    description: '页码',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: String,
    description: '每页数量',
    required: false,
  })
  @ApiQuery({
    name: 'status',
    type: String,
    description: '申请状态',
    required: false,
  })
  @ApiResponse({ status: 200, description: '返回申请列表' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get('admin/artist-applications/:id')
  @UseGuards(JwtAuthGuard)
  @Permissions('application:view')
  @ApiOperation({ summary: '获取艺术家申请详情' })
  @ApiParam({ name: 'id', type: Number, description: '申请ID' })
  @ApiResponse({ status: 200, description: '返回申请详情' })
  @ApiResponse({ status: 404, description: '申请不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch('admin/artist-applications/:id/approve')
  @UseGuards(JwtAuthGuard)
  @Permissions('application:manage')
  @OperationLog({ module: 'artist-applications', action: 'approve', targetType: 'artist-application', logResponse: false })
  @ApiOperation({ summary: '批准艺术家申请' })
  @ApiParam({ name: 'id', type: Number, description: '申请ID' })
  @ApiResponse({ status: 200, description: '批准成功' })
  @ApiResponse({ status: 404, description: '申请不存在' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { userId: number } },
  ) {
    return this.service.approve(id, request.user.userId);
  }

  @Patch('admin/artist-applications/:id/reject')
  @UseGuards(JwtAuthGuard)
  @Permissions('application:manage')
  @OperationLog({ module: 'artist-applications', action: 'reject', targetType: 'artist-application', logResponse: false })
  @ApiOperation({ summary: '拒绝艺术家申请' })
  @ApiParam({ name: 'id', type: Number, description: '申请ID' })
  @ApiResponse({ status: 200, description: '拒绝成功' })
  @ApiResponse({ status: 404, description: '申请不存在' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { userId: number } },
  ) {
    return this.service.reject(id, request.user.userId);
  }
}
