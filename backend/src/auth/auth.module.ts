import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../common/prisma/prisma.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'nailbook-secret-key',
      signOptions: { expiresIn: '8h' },
    }),
    PrismaModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    PermissionGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, PermissionGuard],
})
export class AuthModule {}
