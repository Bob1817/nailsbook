import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperationLog } from '../auth/operation-log.decorator';
import { Permissions } from '../auth/permission.decorator';
import { CreatePlatformCampaignDto } from './dto/create-platform-campaign.dto';
import { QueryPlatformCampaignDto } from './dto/query-platform-campaign.dto';
import { UpdatePlatformCampaignDto } from './dto/update-platform-campaign.dto';
import { PlatformCampaignsService } from './platform-campaigns.service';

@ApiTags('超管后台-活动中心')
@ApiBearerAuth()
@Controller('admin/platform-campaigns')
@UseGuards(JwtAuthGuard)
export class AdminPlatformCampaignsController {
  constructor(private readonly service: PlatformCampaignsService) {}

  @Get()
  @Permissions('dashboard:view')
  @ApiOperation({ summary: '查询平台活动列表' })
  list(@Query() query: QueryPlatformCampaignDto) {
    return this.service.listAdmin(query);
  }

  @Get(':id')
  @Permissions('dashboard:view')
  @ApiOperation({ summary: '查询平台活动详情' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAdminDetail(id);
  }

  @Post()
  @Permissions('dashboard:view')
  @ApiOperation({ summary: '创建平台活动' })
  @OperationLog({ module: 'platform-campaign', action: 'create' })
  create(
    @Body() dto: CreatePlatformCampaignDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.create(dto, req.user?.id);
  }

  @Put(':id')
  @Permissions('dashboard:view')
  @ApiOperation({ summary: '更新平台活动' })
  @OperationLog({ module: 'platform-campaign', action: 'update' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlatformCampaignDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Permissions('dashboard:view')
  @ApiOperation({ summary: '切换平台活动状态' })
  @OperationLog({ module: 'platform-campaign', action: 'set-status' })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'draft' | 'active' | 'offline' | 'ended',
  ) {
    return this.service.setStatus(id, status);
  }

  @Delete(':id')
  @Permissions('dashboard:view')
  @ApiOperation({ summary: '删除平台活动' })
  @OperationLog({ module: 'platform-campaign', action: 'delete' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

@ApiTags('平台活动（公开访问）')
@Controller('platform-campaigns')
export class PublicPlatformCampaignsController {
  constructor(private readonly service: PlatformCampaignsService) {}

  @Get('active')
  @ApiOperation({ summary: '获取正在生效的活动列表' })
  getActiveCampaigns(
    @Query('location') location?: string,
    @Query('audience') audience?: string,
  ) {
    return this.service.getActiveCampaigns({ location, audience });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取活动公开详情（增加阅读数）' })
  getPublicDetail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublicDetail(id);
  }

  @Post(':id/click')
  @ApiOperation({ summary: '记录活动点击事件' })
  recordClick(@Param('id', ParseIntPipe) id: number) {
    return this.service.recordClick(id);
  }
}
