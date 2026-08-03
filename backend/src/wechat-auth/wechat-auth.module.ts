import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { TechnicianAuthModule } from '../technician-auth/technician-auth.module';
import { WechatAuthController } from './wechat-auth.controller';
import { WechatAuthService } from './wechat-auth.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ClientAuthModule,
    TechnicianAuthModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret =
          config.get<string>('WECHAT_SESSION_SECRET') ??
          config.get<string>('JWT_SECRET');
        if (!secret && config.get<string>('NODE_ENV') === 'production') {
          throw new Error('WECHAT_SESSION_SECRET is required');
        }
        return { secret: secret ?? 'non-production-wechat-session-secret' };
      },
    }),
  ],
  controllers: [WechatAuthController],
  providers: [WechatAuthService],
  exports: [WechatAuthService],
})
export class WechatAuthModule {}
