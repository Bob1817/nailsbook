import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  ParseIntPipe,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { AdminWorksService } from './admin-works.service';

@ApiTags('管理-作品')
@ApiBearerAuth()
@Controller('admin/works')
@UseGuards(JwtAuthGuard)
export class AdminWorksController {
  constructor(private readonly service: AdminWorksService) {}

  @Get()
  @Permissions('work:view')
  @ApiOperation({ summary: '全平台作品列表' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('technicianId') technicianId?: string,
    @Query('keyword') keyword?: string,
    @Query('isVisible') isVisible?: string,
    @Query('isHomepageFeatured') isHomepageFeatured?: string,
    @Query('publicationStatus') publicationStatus?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      technicianId: technicianId ? Number(technicianId) : undefined,
      keyword,
      isVisible:
        isVisible === 'true' ? true : isVisible === 'false' ? false : undefined,
      isHomepageFeatured:
        isHomepageFeatured === 'true'
          ? true
          : isHomepageFeatured === 'false'
            ? false
            : undefined,
      publicationStatus,
    });
  }

  @Patch(':id/review')
  @Permissions('work:manage')
  @OperationLog({ module: 'work', action: 'review', targetType: 'work' })
  @ApiOperation({ summary: '审核通过或驳回作品发布' })
  review(
    @Req() request: { user: { userId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { decision: 'approved' | 'rejected'; note?: string },
  ) {
    return this.service.review(
      id,
      request.user.userId,
      body.decision,
      body.note,
    );
  }

  @Get(':id')
  @Permissions('work:view')
  @ApiOperation({ summary: '作品详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/visibility')
  @Permissions('work:manage')
  @OperationLog({ module: 'work', action: 'toggle_visibility', targetType: 'work' })
  @ApiOperation({ summary: '切换作品可见性' })
  toggleVisibility(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleVisibility(id);
  }

  @Patch(':id/homepage-featured')
  @Permissions('work:manage')
  @OperationLog({ module: 'work', action: 'toggle_homepage_featured', targetType: 'work' })
  @ApiOperation({ summary: '切换官网精选' })
  toggleHomepageFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleHomepageFeatured(id);
  }

  @Patch(':id/tags')
  @Permissions('work:manage')
  @OperationLog({ module: 'work', action: 'update_tags', targetType: 'work' })
  @ApiOperation({ summary: '更新作品标签' })
  updateTags(
    @Param('id', ParseIntPipe) id: number,
    @Body('tags') tags: string,
  ) {
    return this.service.updateTags(id, tags);
  }

  @Delete(':id')
  @Permissions('work:manage')
  @OperationLog({ module: 'work', action: 'delete', targetType: 'work' })
  @ApiOperation({ summary: '删除作品' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
