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
import { BindTechnicianDto } from './dto/bind-technician.dto';
import { CheckPhoneDto } from '../technician-auth/dto/check-phone.dto';
import { RefreshTokenDto } from '../common/dto/refresh-token.dto';
import { ClientChangePasswordDto } from './dto/change-password.dto';

@Controller('client/auth')
@ApiTags('客户端-认证')
@ApiBearerAuth()
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

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

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回token' })
  @ApiResponse({ status: 401, description: '验证码错误' })
  @ApiBody({ type: ClientLoginDto })
  async login(@Body() body: ClientLoginDto) {
    return this.clientAuthService.login(body);
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
    @Body() body: { nickname?: string; avatarUrl?: string },
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
