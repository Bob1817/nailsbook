import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianAuthController } from './technician-auth.controller';
import { TechnicianAuthService } from './technician-auth.service';
import { TechnicianJwtStrategy } from './technician-jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('TECHNICIAN_JWT_SECRET') ??
          configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error(
            'TECHNICIAN_JWT_SECRET is required for technician auth',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h') as any,
          },
        };
      },
    }),
    PrismaModule,
  ],
  controllers: [TechnicianAuthController],
  providers: [TechnicianAuthService, TechnicianJwtStrategy],
  exports: [TechnicianAuthService],
})
export class TechnicianAuthModule {}
