import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
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

  validate(payload: any) {
    if (payload.userType === 'client' || payload.userType === 'technician') {
      throw new UnauthorizedException('无效的管理员令牌');
    }
    return {
      userId: payload.sub,
      username: payload.username,
      roleId: payload.roleId,
      permissions: payload.permissions,
    };
  }
}
