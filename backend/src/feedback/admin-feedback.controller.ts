import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { FeedbackService } from './feedback.service';

@ApiTags('管理-问题反馈')
@ApiBearerAuth()
@Controller('admin/feedback')
@UseGuards(JwtAuthGuard)
export class AdminFeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  @Permissions('feedback:view')
  @ApiOperation({ summary: '问题反馈列表' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('sourceType') sourceType?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      sourceType,
    });
  }

  @Patch(':id/resolve')
  @Permissions('feedback:manage')
  @OperationLog({ module: 'feedback', action: 'resolve', targetType: 'feedback' })
  @ApiOperation({ summary: '标记反馈为已处理' })
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.service.resolve(id);
  }
}
