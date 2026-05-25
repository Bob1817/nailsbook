import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    realName: string;
    roleId: number;
    roleName: string;
    permissions: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<LoginResponse> {
    const user = await this.prisma.adminUser.findUnique({
      where: { username },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const permissions = user.role.permissions.map((p) => p.permission.code);

    const payload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      permissions,
    };

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.signRefreshToken(user.id),
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName || '',
        roleId: user.roleId,
        roleName: user.role.name,
        permissions,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('无效的令牌类型');
    }

    const user = await this.getUserById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    const permissions = user.role.permissions.map((p) => p.permission.code);
    const accessTokenPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      permissions,
    };

    return {
      accessToken: this.jwtService.sign(accessTokenPayload),
      refreshToken: this.signRefreshToken(user.id),
    };
  }

  private signRefreshToken(userId: number) {
    return this.jwtService.sign(
      { sub: userId, tokenType: 'refresh' },
      { expiresIn: '30d' },
    );
  }

  async getUserById(userId: number) {
    return this.prisma.adminUser.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }
}
