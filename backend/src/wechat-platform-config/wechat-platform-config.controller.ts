import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperationLog } from '../auth/operation-log.decorator';
import { Permissions } from '../auth/permission.decorator';
import {
  UpdateMiniProgramLaunchConfigDto,
  UpdateWechatLoginConfigDto,
  UpdateWechatPaymentConfigDto,
} from './dto/update-wechat-config.dto';
import { WechatPlatformConfigService } from './wechat-platform-config.service';

@Controller('admin/wechat-config')
@UseGuards(JwtAuthGuard)
export class AdminWechatPlatformConfigController {
  constructor(private readonly service: WechatPlatformConfigService) {}

  @Get()
  @Permissions('feature_flag:view')
  getConfig() {
    return this.service.getAdminConfig();
  }

  @Patch('login')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_config', action: 'update_login' })
  updateLogin(@Body() dto: UpdateWechatLoginConfigDto) {
    return this.service.updateLogin(dto);
  }

  @Post('login/validate')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_config', action: 'validate_login' })
  validateLogin() {
    return this.service.validateLogin();
  }

  @Patch('payment')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_config', action: 'update_payment' })
  updatePayment(@Body() dto: UpdateWechatPaymentConfigDto) {
    return this.service.updatePayment(dto);
  }

  @Post('payment/validate')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_config', action: 'validate_payment' })
  validatePayment() {
    return this.service.validatePayment();
  }

  @Get('launch')
  @Permissions('feature_flag:view')
  getLaunchConfig() {
    return this.service.getLaunchConfig();
  }

  @Patch('launch')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'wechat_config', action: 'update_launch_config' })
  updateLaunchConfig(@Body() dto: UpdateMiniProgramLaunchConfigDto) {
    return this.service.updateLaunchConfig(dto);
  }
}

@Controller('public/capabilities')
export class PublicCapabilitiesController {
  constructor(private readonly service: WechatPlatformConfigService) {}

  @Get()
  getCapabilities() {
    return this.service.getCapabilities();
  }
}

@Controller('public/launch-config')
export class PublicLaunchConfigController {
  constructor(private readonly service: WechatPlatformConfigService) {}

  @Get()
  getConfig() {
    return this.service.getPublicLaunchConfig();
  }
}
