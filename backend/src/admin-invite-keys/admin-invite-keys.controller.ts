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
import { AdminInviteKeysService } from './admin-invite-keys.service';

@ApiTags('管理-美甲师邀请密钥')
@ApiBearerAuth()
@Controller('admin/technician-invite-keys')
@UseGuards(JwtAuthGuard)
export class AdminInviteKeysController {
  constructor(private readonly service: AdminInviteKeysService) {}

  @Get()
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
  @ApiOperation({ summary: '生成邀请密钥（可批量）' })
  create(
    @Req() request: { user?: { id?: number } },
    @Body() body: { note?: string; count?: number },
  ) {
    return this.service.create({
      note: body.note,
      count: body.count,
      createdByAdminId: request.user?.id,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除未使用的邀请密钥' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
