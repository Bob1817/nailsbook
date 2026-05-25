import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class TechnicianJwtStrategy extends PassportStrategy(
  Strategy,
  'technician-jwt',
) {
  constructor(configService: ConfigService) {
    const secret =
      configService.get<string>('TECHNICIAN_JWT_SECRET') ??
      configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('TECHNICIAN_JWT_SECRET is required for technician auth');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: any) {
    if (payload.userType !== 'technician') {
      throw new UnauthorizedException('无效的美甲师令牌');
    }
    return {
      technicianId: payload.sub,
      phone: payload.phone,
      userType: payload.userType,
    };
  }
}
