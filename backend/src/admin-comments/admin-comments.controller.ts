import {
  Controller, Get, Param, Patch, Delete,
  Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { AdminCommentsService } from './admin-comments.service';

@ApiTags('管理-评论')
@ApiBearerAuth()
@Controller('admin/comments')
@UseGuards(JwtAuthGuard)
export class AdminCommentsController {
  constructor(private readonly service: AdminCommentsService) {}

  @Get()
  @Permissions('comment:view')
  @ApiOperation({ summary: '全平台评论列表' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: 'normal' | 'hidden',
    @Query('authorType') authorType?: 'client' | 'technician',
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword,
      status,
      authorType,
    });
  }

  @Patch(':id/hide')
  @Permissions('comment:manage')
  @OperationLog({ module: 'comment', action: 'toggle_hide', targetType: 'comment' })
  @ApiOperation({ summary: '切换评论隐藏状态' })
  toggleHide(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleHide(id);
  }

  @Delete(':id')
  @Permissions('comment:manage')
  @OperationLog({ module: 'comment', action: 'delete', targetType: 'comment' })
  @ApiOperation({ summary: '强制删除评论' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
