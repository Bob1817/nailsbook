import {
  Controller, Get, Param, Patch,
  Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { AdminReportsService } from './admin-reports.service';

@ApiTags('管理-举报')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class AdminReportsController {
  constructor(private readonly service: AdminReportsService) {}

  @Get()
  @Permissions('report:view')
  @ApiOperation({ summary: '举报列表' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Patch(':id/resolve')
  @Permissions('report:manage')
  @ApiOperation({ summary: '处置举报（删除评论）' })
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.service.resolve(id);
  }

  @Patch(':id/dismiss')
  @Permissions('report:manage')
  @ApiOperation({ summary: '驳回举报' })
  dismiss(@Param('id', ParseIntPipe) id: number) {
    return this.service.dismiss(id);
  }
}
