import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Ip,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SystemErrorsService } from './system-errors.service';
import { CreateErrorReportDto } from './dto/create-error-report.dto';
import {
  QuerySystemErrorsDto,
  ResolveErrorDto,
  BatchResolveErrorDto,
} from './dto/query-system-errors.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';

@ApiTags('公共-错误上报')
@Controller('public/error-reports')
export class PublicErrorReportsController {
  constructor(private readonly service: SystemErrorsService) {}

  @Post()
  @ApiOperation({ summary: '小程序/前端客户端错误静默上报' })
  @ApiResponse({ status: 201, description: '上报成功' })
  report(@Body() dto: CreateErrorReportDto, @Ip() ip: string) {
    return this.service.recordError(dto, ip);
  }
}

@ApiTags('管理员-系统错误监控')
@ApiBearerAuth()
@Controller('admin/system-errors')
@UseGuards(JwtAuthGuard)
export class AdminSystemErrorsController {
  constructor(private readonly service: SystemErrorsService) {}

  @Get()
  @Permissions('log:view')
  @ApiOperation({ summary: '分页查询系统异常错误日志' })
  findAll(@Query() query: QuerySystemErrorsDto) {
    return this.service.findAll(query);
  }

  @Get('groups')
  @Permissions('log:view')
  @ApiOperation({ summary: '按同类型合并聚合查询系统错误与优先级分类' })
  findGroups(@Query() query: QuerySystemErrorsDto) {
    return this.service.findGroups(query);
  }

  @Get('stats')
  @Permissions('log:view')
  @ApiOperation({ summary: '获取系统异常统计指标' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @Permissions('log:view')
  @ApiOperation({ summary: '获取单条错误详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/resolve')
  @Permissions('log:view')
  @OperationLog({ module: 'system_error', action: 'resolve', targetType: 'system_error' })
  @ApiOperation({ summary: '标记错误为已解决/已排查' })
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveErrorDto,
  ) {
    return this.service.resolve(id, dto.note);
  }

  @Post('batch-resolve')
  @Permissions('log:view')
  @OperationLog({ module: 'system_error', action: 'batch_resolve', targetType: 'system_error' })
  @ApiOperation({ summary: '批量标记错误为已解决' })
  batchResolve(@Body() dto: BatchResolveErrorDto) {
    return this.service.batchResolve(dto.ids, dto.note);
  }
}
