import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WechatLoginDto } from './dto/wechat-login.dto';
import {
  WechatClientCompleteDto,
  WechatTechnicianCompleteDto,
} from './dto/wechat-complete.dto';
import { WechatPhoneResetDto } from './dto/wechat-phone-reset.dto';
import { WechatAuthService } from './wechat-auth.service';

@ApiTags('微信小程序-认证')
@Controller('wechat/auth')
export class WechatAuthController {
  constructor(private readonly service: WechatAuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '使用 wx.login code 登录或取得短期绑定凭证' })
  login(@Body() dto: WechatLoginDto) {
    return this.service.login(dto.code, dto.role);
  }

  @Post('client/complete')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '微信手机号授权后注册或绑定客户账号' })
  completeClient(@Body() dto: WechatClientCompleteDto) {
    return this.service.completeClient(dto);
  }

  @Post('technician/complete')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '微信手机号授权后绑定或受邀注册美甲师账号' })
  completeTechnician(@Body() dto: WechatTechnicianCompleteDto) {
    return this.service.completeTechnician(dto);
  }

  @Post('client/reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '忘记密码：微信手机号授权验证后重置客户密码' })
  resetClientPassword(@Body() dto: WechatPhoneResetDto) {
    return this.service.resetClientPasswordByPhoneCode(dto);
  }

  @Post('technician/reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '忘记密码：微信手机号授权验证后重置美甲师密码' })
  resetTechnicianPassword(@Body() dto: WechatPhoneResetDto) {
    return this.service.resetTechnicianPasswordByPhoneCode(dto);
  }

  @Post('technician/set-initial-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '首次设密：微信手机号授权验证后设置美甲师登录密码' })
  setTechnicianInitialPassword(@Body() dto: WechatPhoneResetDto) {
    return this.service.setTechnicianInitialPasswordByPhoneCode(dto);
  }
}
