import { BindSharedWorkDto } from './dto/bind-shared-work.dto';
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Req,
  UseGuards,
  Param,
  Query,
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
import { Throttle } from '@nestjs/throttler';
import { ClientAuthService } from './client-auth.service';
import { ClientJwtAuthGuard } from './client-jwt-auth.guard';
import { ClientLoginDto } from './dto/client-login.dto';
import { RegisterByInviteDto } from './dto/register-by-invite.dto';
import { RegisterBySmsDto } from './dto/register-by-sms.dto';
import { LoginBySmsDto } from './dto/login-by-sms.dto';
import { SendSmsLoginDto } from './dto/send-sms-login.dto';
import { ActivateTechnicianDto } from './dto/activate-technician.dto';
import { BindTechnicianDto } from './dto/bind-technician.dto';
import { CheckPhoneDto } from '../technician-auth/dto/check-phone.dto';
import { RefreshTokenDto } from '../common/dto/refresh-token.dto';
import { ClientChangePasswordDto } from './dto/change-password.dto';
import {
  ClientForgotSendCodeDto,
  ClientForgotResetDto,
} from './dto/forgot-password.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { SelectRoleDto } from './dto/select-role.dto';
import { RegisterDeviceTokenDto } from '../notifications/dto/register-device-token.dto';
import { PushService } from '../notifications/push.service';

@Controller('client/auth')
@ApiTags('客户端-认证')
@ApiBearerAuth()
export class ClientAuthController {
  constructor(
    private readonly clientAuthService: ClientAuthService,
    private readonly pushService: PushService,
  ) {}

  @Get('find-by-invite-code')
  @ApiOperation({ summary: '通过邀请码查找美甲师' })
  @ApiResponse({ status: 200, description: '查找成功，返回美甲师信息' })
  @ApiResponse({ status: 404, description: '邀请码无效' })
  @ApiQuery({ name: 'code', type: String, description: '邀请码' })
  async findByInviteCode(@Query('code') code: string) {
    return this.clientAuthService.findTechnicianByInviteCode(code);
  }

  @Post('check-phone')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '检查手机号是否已注册' })
  @ApiResponse({ status: 200, description: '返回 { exists: boolean }' })
  @ApiBody({ type: CheckPhoneDto })
  async checkPhone(@Body() body: CheckPhoneDto) {
    return this.clientAuthService.checkPhone(body.phone);
  }

  @Post('register-by-invite')
  @ApiOperation({ summary: '通过邀请码注册' })
  @ApiResponse({ status: 200, description: '注册成功，返回token' })
  @ApiResponse({ status: 400, description: '验证码错误或邀请码无效' })
  @ApiBody({ type: RegisterByInviteDto })
  async registerByInvite(@Body() body: RegisterByInviteDto) {
    return this.clientAuthService.registerByInvite(body);
  }

  // ── SMS 验证码登录 / 注册（免邀请码） ──

  @Post('send-sms-login')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '发送登录短信验证码（仅已注册手机号真实发送）' })
  @ApiBody({ type: SendSmsLoginDto })
  @ApiResponse({ status: 200, description: '已发送（防枚举，统一返回）' })
  async sendSmsCodeForLogin(@Body() body: SendSmsLoginDto) {
    return this.clientAuthService.sendSmsCodeForLogin(body.phone);
  }

  @Post('send-sms-register')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '发送注册短信验证码（仅未注册手机号真实发送）' })
  @ApiBody({ type: SendSmsLoginDto })
  @ApiResponse({ status: 200, description: '已发送（防枚举，统一返回）' })
  async sendSmsCodeForRegister(@Body() body: SendSmsLoginDto) {
    return this.clientAuthService.sendSmsCodeForRegister(body.phone);
  }

  @Post('register-by-sms')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '手机号 + 短信验证码注册（免邀请码）' })
  @ApiBody({ type: RegisterBySmsDto })
  @ApiResponse({
    status: 200,
    description: '注册成功，返回 token + needsOnboarding',
  })
  @ApiResponse({ status: 400, description: '验证码错误或手机号已注册' })
  async registerBySms(@Body() body: RegisterBySmsDto) {
    return this.clientAuthService.registerBySms(body);
  }

  @Post('login-by-sms')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '手机号 + 短信验证码登录（免密码，免绑定）' })
  @ApiBody({ type: LoginBySmsDto })
  @ApiResponse({ status: 200, description: '登录成功，返回 token + roles' })
  @ApiResponse({ status: 401, description: '验证码错误或账号不存在' })
  async loginBySms(@Body() body: LoginBySmsDto) {
    return this.clientAuthService.loginBySms(body);
  }

  @Post('activate-technician')
  @UseGuards(ClientJwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary: '激活美甲师身份（需先登录为客户，使用超管后台生成的激活密钥）',
  })
  @ApiBody({ type: ActivateTechnicianDto })
  @ApiResponse({ status: 201, description: '激活成功，返回美甲师 token' })
  @ApiResponse({ status: 400, description: '密钥无效或已被使用' })
  @ApiResponse({ status: 409, description: '该手机号已是美甲师' })
  async activateTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: ActivateTechnicianDto,
  ) {
    return this.clientAuthService.activateTechnician(
      request.user.clientUserId,
      body.activationKey,
    );
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回token' })
  @ApiResponse({ status: 401, description: '验证码错误' })
  @ApiBody({ type: ClientLoginDto })
  async login(@Body() body: ClientLoginDto) {
    return this.clientAuthService.login(body);
  }

  @Post('forgot-password/send-code')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '忘记密码：发送短信验证码' })
  @ApiBody({ type: ClientForgotSendCodeDto })
  @ApiResponse({
    status: 200,
    description: '已发送（无论手机号是否注册均返回成功）',
  })
  async sendResetCode(@Body() body: ClientForgotSendCodeDto) {
    return this.clientAuthService.sendResetCode(body.phone);
  }

  @Post('forgot-password/reset')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '忘记密码：校验验证码并重置密码' })
  @ApiBody({ type: ClientForgotResetDto })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiResponse({ status: 400, description: '验证码错误/过期或新密码不合规' })
  async resetPasswordByCode(@Body() body: ClientForgotResetDto) {
    return this.clientAuthService.resetPasswordByCode(
      body.phone,
      body.code,
      body.newPassword,
    );
  }

  @Post('setup-password')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '微信注册后首次设置登录密码' })
  @ApiBody({ type: SetupPasswordDto })
  @ApiResponse({ status: 200, description: '密码设置成功并返回登录凭证' })
  @ApiResponse({ status: 401, description: '密码设置凭证无效或已过期' })
  async setupPassword(@Body() body: SetupPasswordDto) {
    return this.clientAuthService.setupPassword(body);
  }

  @Post('select-role')
  @UseGuards(ClientJwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '注册后选择角色（客户/美甲师），可跳过绑定/激活' })
  @ApiBody({ type: SelectRoleDto })
  @ApiResponse({ status: 200, description: '返回对应角色的登录凭证' })
  @ApiResponse({ status: 400, description: '参数错误或密钥无效' })
  async selectRole(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: SelectRoleDto,
  ) {
    return this.clientAuthService.selectRole(request.user.clientUserId, body);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '刷新令牌' })
  @ApiResponse({ status: 200, description: '返回新的访问令牌和刷新令牌' })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  @ApiBody({ type: RefreshTokenDto })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.clientAuthService.refreshAccessToken(body.refreshToken);
  }

  @Get('me')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '返回用户信息' })
  async me(@Req() request: { user: { clientUserId: number } }) {
    return this.clientAuthService.getProfile(request.user.clientUserId);
  }

  @Post('device-token')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '上报设备推送 token' })
  @ApiResponse({ status: 201, description: 'token 已记录' })
  async registerDeviceToken(
    @Req() request: { user: { clientUserId: number } },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    await this.pushService.registerToken({
      role: 'client',
      clientUserId: request.user.clientUserId,
      token: dto.token,
      platform: dto.platform,
    });
    return { success: true };
  }

  @Post('bind-technician')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '绑定美甲师' })
  @ApiResponse({ status: 200, description: '绑定成功' })
  @ApiResponse({ status: 400, description: '邀请码无效' })
  @ApiBody({ type: BindTechnicianDto })
  async bindTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: BindTechnicianDto,
  ) {
    return this.clientAuthService.bindTechnician(
      request.user.clientUserId,
      body,
    );
  }

  @Post('bind-shared-work')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '确认作品分享来源后直接绑定所属美甲师' })
  bindSharedWork(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: BindSharedWorkDto,
  ) {
    return this.clientAuthService.bindSharedWork(request.user.clientUserId, body);
  }

  @Post('binding-applications/request')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '历史会话再次申请绑定（无需邀请码）' })
  @ApiResponse({ status: 201, description: '申请已提交' })
  async requestRebind(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: { techId: number; note?: string },
  ) {
    return this.clientAuthService.requestRebind(
      request.user.clientUserId,
      Number(body.techId),
      body.note,
    );
  }

  @Get('followed-technicians')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '可申请绑定的已关注美甲师' })
  async followedTechnicians(
    @Req() request: { user: { clientUserId: number } },
  ) {
    return this.clientAuthService.listFollowedTechnicians(
      request.user.clientUserId,
    );
  }

  @Delete('unbind-technician/:techId')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '解绑美甲师' })
  @ApiResponse({ status: 200, description: '解绑成功' })
  @ApiParam({ name: 'techId', type: String, description: '美甲师ID' })
  async unbindTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Param('techId') techId: string,
  ) {
    return this.clientAuthService.unbindTechnician(
      request.user.clientUserId,
      parseInt(techId, 10),
    );
  }

  @Post('set-default-technician/:techId')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '设置默认美甲师' })
  @ApiResponse({ status: 200, description: '设置成功' })
  @ApiParam({ name: 'techId', type: String, description: '美甲师ID' })
  async setDefaultTechnician(
    @Req() request: { user: { clientUserId: number } },
    @Param('techId') techId: string,
  ) {
    return this.clientAuthService.setDefaultTechnician(
      request.user.clientUserId,
      parseInt(techId, 10),
    );
  }

  @Put('me')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '更新用户资料' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nickname: { type: 'string', description: '昵称' },
        avatarUrl: { type: 'string', description: '头像URL' },
      },
    },
  })
  async updateProfile(
    @Req() request: { user: { clientUserId: number } },
    @Body()
    body: {
      nickname?: string;
      avatarUrl?: string;
      city?: string | null;
      bio?: string | null;
    },
  ) {
    return this.clientAuthService.updateProfile(
      request.user.clientUserId,
      body,
    );
  }

  @Patch('password')
  @UseGuards(ClientJwtAuthGuard)
  @ApiOperation({ summary: '修改密码' })
  @ApiBody({ type: ClientChangePasswordDto })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '当前密码不正确或新密码不合规' })
  async changePassword(
    @Req() request: { user: { clientUserId: number } },
    @Body() body: ClientChangePasswordDto,
  ) {
    return this.clientAuthService.changePassword(
      request.user.clientUserId,
      body.oldPassword,
      body.newPassword,
    );
  }
}
