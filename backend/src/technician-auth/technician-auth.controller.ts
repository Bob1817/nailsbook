import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from './technician-jwt-auth.guard';
import { TechnicianAuthService } from './technician-auth.service';
import { TechnicianLoginDto } from './dto/technician-login.dto';
import { TechnicianRegisterDto } from './dto/technician-register.dto';
import { CheckPhoneDto } from './dto/check-phone.dto';
import { UpdateTechnicianProfileDto } from './dto/update-technician-profile.dto';
import { UpdateTechnicianSelfStatusDto } from './dto/update-technician-status.dto';
import { UpdateTechnicianServiceTypeDto } from './dto/update-service-type.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotSendCodeDto, ForgotResetDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from '../common/dto/refresh-token.dto';

@ApiTags('美甲师-认证')
@ApiBearerAuth()
@Controller('technician/auth')
export class TechnicianAuthController {
  constructor(private readonly technicianAuthService: TechnicianAuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '美甲师登录' })
  @ApiBody({ type: TechnicianLoginDto })
  @ApiResponse({ status: 200, description: '登录成功，返回token' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  async login(@Body() body: TechnicianLoginDto) {
    return this.technicianAuthService.login(body.phone, body.password);
  }

  @Post('forgot-password/send-code')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '忘记密码：发送短信验证码' })
  @ApiBody({ type: ForgotSendCodeDto })
  @ApiResponse({ status: 200, description: '已发送（无论手机号是否注册均返回成功）' })
  async sendResetCode(@Body() body: ForgotSendCodeDto) {
    return this.technicianAuthService.sendResetCode(body.phone);
  }

  @Post('forgot-password/reset')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '忘记密码：校验验证码并重置密码' })
  @ApiBody({ type: ForgotResetDto })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiResponse({ status: 400, description: '验证码错误/过期或新密码不合规' })
  async resetPasswordByCode(@Body() body: ForgotResetDto) {
    return this.technicianAuthService.resetPasswordByCode(
      body.phone,
      body.code,
      body.newPassword,
    );
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '刷新令牌' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: '返回新的访问令牌和刷新令牌' })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.technicianAuthService.refreshAccessToken(body.refreshToken);
  }

  @Post('check-phone')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '检查手机号是否已注册' })
  @ApiBody({ type: CheckPhoneDto })
  @ApiResponse({ status: 200, description: '返回 { exists: boolean }' })
  async checkPhone(@Body() body: CheckPhoneDto) {
    return this.technicianAuthService.checkPhone(body.phone);
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '美甲师注册（使用邀请密钥）' })
  @ApiBody({ type: TechnicianRegisterDto })
  @ApiResponse({ status: 201, description: '注册成功，返回 token' })
  @ApiResponse({ status: 400, description: '密钥无效或已被使用' })
  @ApiResponse({ status: 409, description: '手机号已注册' })
  async register(@Body() body: TechnicianRegisterDto) {
    return this.technicianAuthService.register(body);
  }

  @Get('me')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '获取当前美甲师信息' })
  @ApiResponse({ status: 200, description: '返回美甲师资料' })
  @ApiResponse({ status: 401, description: '未授权' })
  async me(@Req() request: { user: { technicianId: number } }) {
    return this.technicianAuthService.getProfile(request.user.technicianId);
  }

  @Patch('status')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '更新美甲师状态' })
  @ApiBody({ type: UpdateTechnicianSelfStatusDto })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async updateStatus(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianSelfStatusDto,
  ) {
    return this.technicianAuthService.updateStatus(
      request.user.technicianId,
      body.status,
    );
  }

  @Patch('profile')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '更新美甲师资料' })
  @ApiBody({ type: UpdateTechnicianProfileDto })
  @ApiResponse({ status: 200, description: '资料更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async updateProfile(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianProfileDto,
  ) {
    return this.technicianAuthService.updateProfile(
      request.user.technicianId,
      body,
    );
  }

  @Patch('password')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '修改密码' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '当前密码不正确或新密码不合规' })
  @ApiResponse({ status: 401, description: '未授权' })
  async changePassword(
    @Req() request: { user: { technicianId: number } },
    @Body() body: ChangePasswordDto,
  ) {
    return this.technicianAuthService.changePassword(
      request.user.technicianId,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Patch('service-type')
  @UseGuards(TechnicianJwtAuthGuard)
  @ApiOperation({ summary: '更新服务类型' })
  @ApiBody({ type: UpdateTechnicianServiceTypeDto })
  @ApiResponse({ status: 200, description: '服务类型更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async updateServiceType(
    @Req() request: { user: { technicianId: number } },
    @Body() body: UpdateTechnicianServiceTypeDto,
  ) {
    console.log(
      'updateServiceType called with body:',
      JSON.stringify(body, null, 2),
    );
    return this.technicianAuthService.updateServiceType(
      request.user.technicianId,
      body,
    );
  }
}
