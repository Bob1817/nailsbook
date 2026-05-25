import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from '../common/dto/refresh-token.dto';

@ApiTags('管理员-认证')
@ApiBearerAuth()
@Controller('admin/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '管理员登录' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: '登录成功，返回JWT令牌' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '刷新令牌' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: '返回新的访问令牌和刷新令牌' })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前管理员信息' })
  @ApiResponse({ status: 200, description: '返回管理员资料' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getProfile(@GetUser() user: any) {
    const dbUser = await this.authService.getUserById(user.userId);
    if (!dbUser) {
      return null;
    }

    const permissions = dbUser.role.permissions.map((p) => p.permission.code);

    return {
      id: dbUser.id,
      username: dbUser.username,
      realName: dbUser.realName || '',
      email: dbUser.email,
      phone: dbUser.phone,
      roleId: dbUser.roleId,
      roleName: dbUser.role.name,
      permissions,
      status: dbUser.status,
      lastLoginAt: dbUser.lastLoginAt,
      createdAt: dbUser.createdAt,
    };
  }
}
