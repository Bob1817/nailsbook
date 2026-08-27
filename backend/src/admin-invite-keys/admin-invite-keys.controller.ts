import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { AdminInviteKeysService } from './admin-invite-keys.service';

@ApiTags('管理-美甲师邀请密钥')
@ApiBearerAuth()
@Controller('admin/technician-invite-keys')
@UseGuards(JwtAuthGuard)
export class AdminInviteKeysController {
  constructor(private readonly service: AdminInviteKeysService) {}

  @Get()
  @Permissions('technician:create')
  @ApiOperation({ summary: '获取邀请密钥列表' })
  list(
    @Query('used') used?: 'true' | 'false',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list({
      used,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @Permissions('technician:create')
  @OperationLog({ module: 'technician_invite_key', action: 'create', logResponse: false })
  @ApiOperation({ summary: '生成邀请密钥（可批量）' })
  create(
    @Req() request: { user?: { userId?: number } },
    @Body() body: { note?: string; count?: number },
  ) {
    return this.service.create({
      note: body.note,
      count: body.count,
      createdByAdminId: request.user?.userId,
    });
  }

  @Delete(':id')
  @Permissions('technician:delete')
  @OperationLog({ module: 'technician_invite_key', action: 'delete', targetType: 'technician_invite_key' })
  @ApiOperation({ summary: '删除未使用的邀请密钥' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
