import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperationLog } from '../auth/operation-log.decorator';
import { Permissions } from '../auth/permission.decorator';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { DemoService } from './demo.service';

@ApiTags('超管-Demo 管理')
@ApiBearerAuth()
@Controller('admin/demo')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class DemoAdminController {
  constructor(private readonly demoService: DemoService) {}

  @Get('status')
  @Permissions('feature_flag:view')
  @ApiOperation({ summary: '获取 Demo 状态、开关与最近重置日志' })
  getStatus() {
    return this.demoService.getAdminDemoStatus();
  }

  @Post('toggle')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'demo', action: 'toggle', targetType: 'demo' })
  @ApiOperation({ summary: '一键开启/停用 Demo 与样板间模式（D6）' })
  toggle(@Body() body: { enabled: boolean }) {
    return this.demoService.toggleDemoMode(Boolean(body?.enabled));
  }

  @Post('reset')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'demo', action: 'reset', targetType: 'demo' })
  @ApiOperation({ summary: '手动立即重置 Demo 数据（可选同步重置只读样板）' })
  reset(@Body() body?: { includeShowcase?: boolean }) {
    return this.demoService.resetDemoData(
      'manual',
      Boolean(body?.includeShowcase),
    );
  }
}
