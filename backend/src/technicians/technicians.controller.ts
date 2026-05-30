import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
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
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { UpdateTechnicianStatusDto } from './dto/update-technician-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { OperationLogInterceptor } from '../auth/operation-log.interceptor';

@ApiTags('管理员-美甲师')
@ApiBearerAuth()
@Controller('admin/technicians')
@UseGuards(JwtAuthGuard)
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Get()
  @Permissions('technician.view')
  @ApiOperation({ summary: '获取美甲师列表' })
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
    description: '状态筛选',
    required: false,
  })
  @ApiQuery({
    name: 'search',
    type: String,
    description: '搜索关键词',
    required: false,
  })
  @ApiResponse({ status: 200, description: '返回美甲师列表' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.techniciansService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      search,
    );
  }

  @Get(':id')
  @Permissions('technician.view')
  @ApiOperation({ summary: '获取美甲师详情' })
  @ApiParam({ name: 'id', type: String, description: '美甲师ID' })
  @ApiResponse({ status: 200, description: '返回美甲师详情' })
  @ApiResponse({ status: 404, description: '美甲师不存在' })
  findOne(@Param('id') id: string) {
    return this.techniciansService.findOne(parseInt(id, 10));
  }

  @Post()
  @Permissions('technician.create')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'technician',
    action: 'create',
    targetType: 'technician',
  })
  @ApiOperation({ summary: '创建美甲师' })
  @ApiBody({ type: CreateTechnicianDto })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  create(@Body() dto: CreateTechnicianDto) {
    return this.techniciansService.create(dto);
  }

  @Patch(':id')
  @Permissions('technician.edit')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'technician',
    action: 'update',
    targetType: 'technician',
  })
  @ApiOperation({ summary: '编辑美甲师' })
  @ApiParam({ name: 'id', type: String, description: '美甲师ID' })
  @ApiBody({ type: UpdateTechnicianDto })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(@Param('id') id: string, @Body() dto: UpdateTechnicianDto) {
    return this.techniciansService.update(parseInt(id, 10), dto);
  }

  @Post(':id/invite-key')
  @Permissions('technician.edit')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'technician',
    action: 'generate_invite_key',
    targetType: 'technician',
  })
  @ApiOperation({ summary: '为美甲师生成专属邀请密钥' })
  @ApiParam({ name: 'id', type: String, description: '美甲师ID' })
  @ApiResponse({ status: 201, description: '生成成功' })
  generateInviteKey(
    @Param('id') id: string,
    @Body() body: { note?: string } = {},
  ) {
    return this.techniciansService.generateInviteKey(parseInt(id, 10), body.note);
  }

  @Patch(':id/status')
  @Permissions('technician.disable')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'technician',
    action: 'update_status',
    targetType: 'technician',
  })
  @ApiOperation({ summary: '更新美甲师状态' })
  @ApiParam({ name: 'id', type: String, description: '美甲师ID' })
  @ApiBody({ type: UpdateTechnicianStatusDto })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  @ApiResponse({ status: 404, description: '美甲师不存在' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTechnicianStatusDto,
  ) {
    return this.techniciansService.updateStatus(parseInt(id, 10), dto);
  }

  @Post(':id/reset-password')
  @Permissions('technician.edit')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'technician',
    action: 'reset_password',
    targetType: 'technician',
  })
  @ApiOperation({ summary: '重置美甲师密码（生成一次性临时密码）' })
  @ApiParam({ name: 'id', type: String, description: '美甲师ID' })
  @ApiResponse({ status: 201, description: '重置成功，返回临时密码（仅此次显示）' })
  @ApiResponse({ status: 400, description: '账号未激活' })
  @ApiResponse({ status: 404, description: '美甲师不存在' })
  resetPassword(@Param('id') id: string) {
    return this.techniciansService.resetPassword(parseInt(id, 10));
  }
}
