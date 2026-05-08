import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getClientJwtSecret } from './client-auth.config';

@Injectable()
export class ClientJwtStrategy extends PassportStrategy(Strategy, 'client-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getClientJwtSecret(configService),
    });
  }

  async validate(payload: any) {
    if (payload.userType !== 'client') {
      throw new UnauthorizedException('无效的客户端令牌');
    }

    return {
      clientUserId: payload.sub,
      phone: payload.phone,
      userType: payload.userType,
    };
  }
}
