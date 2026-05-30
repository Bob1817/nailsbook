import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getClientJwtSecret } from './client-auth.config';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ClientJwtStrategy extends PassportStrategy(Strategy, 'client-jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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
    const client = await this.prisma.clientUser.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });
    if (!client) {
      throw new UnauthorizedException('用户不存在');
    }
    // 改密/重置后 tokenVersion 递增，旧令牌随即失效
    if ((payload.tv ?? 0) !== client.tokenVersion) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
    return {
      clientUserId: payload.sub,
      phone: payload.phone,
      userType: payload.userType,
    };
  }
}
