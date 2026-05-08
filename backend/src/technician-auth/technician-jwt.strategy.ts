import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class TechnicianJwtStrategy extends PassportStrategy(Strategy, 'technician-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'nailbook-secret-key',
    });
  }

  async validate(payload: any) {
    return {
      technicianId: payload.sub,
      phone: payload.phone,
      userType: payload.userType,
    };
  }
}
