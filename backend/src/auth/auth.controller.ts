import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('admin/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: any) {
    const dbUser = await this.authService.getUserById(user.userId);
    if (!dbUser) {
      return null;
    }

    const permissions = dbUser.role.permissions.map(p => p.permission.code);

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
