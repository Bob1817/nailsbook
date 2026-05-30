import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TechnicianJwtStrategy extends PassportStrategy(
  Strategy,
  'technician-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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

  async validate(payload: any) {
    if (payload.userType !== 'technician') {
      throw new UnauthorizedException('无效的美甲师令牌');
    }
    const technician = await this.prisma.technician.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });
    if (!technician) {
      throw new UnauthorizedException('美甲师不存在');
    }
    // 改密/重置后 tokenVersion 递增，旧令牌随即失效
    if ((payload.tv ?? 0) !== technician.tokenVersion) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
    return {
      technicianId: payload.sub,
      phone: payload.phone,
      userType: payload.userType,
    };
  }
}
