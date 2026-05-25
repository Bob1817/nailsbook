import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('ADMIN_JWT_SECRET') ??
          configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('ADMIN_JWT_SECRET is required for admin auth');
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
  providers: [AuthService, JwtStrategy, PermissionGuard],
  controllers: [AuthController],
  exports: [AuthService, PermissionGuard],
})
export class AuthModule {}
