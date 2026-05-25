import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../common/prisma/prisma.module';
import { getClientJwtSecret } from './client-auth.config';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';
import { ClientJwtStrategy } from './client-jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getClientJwtSecret(configService),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h') as any,
        },
      }),
    }),
    PrismaModule,
  ],
  controllers: [ClientAuthController],
  providers: [ClientAuthService, ClientJwtStrategy],
  exports: [ClientAuthService],
})
export class ClientAuthModule {}
