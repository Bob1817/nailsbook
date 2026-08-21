import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      configService.get<string>('ADMIN_JWT_SECRET') ??
      configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('ADMIN_JWT_SECRET is required for admin auth');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    if (payload.userType === 'client' || payload.userType === 'technician') {
      throw new UnauthorizedException('无效的管理员令牌');
    }
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true, status: true },
    });
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('管理员账号不存在或已被禁用');
    }
    if ((payload.tv ?? 0) !== admin.tokenVersion) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
    return {
      userId: payload.sub,
      username: payload.username,
      roleId: payload.roleId,
      permissions: payload.permissions,
    };
  }
}
