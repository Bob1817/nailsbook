import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianAuthController } from './technician-auth.controller';
import { TechnicianAuthService } from './technician-auth.service';
import { TechnicianJwtStrategy } from './technician-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'nailbook-secret-key',
      signOptions: { expiresIn: '8h' },
    }),
    PrismaModule,
  ],
  controllers: [TechnicianAuthController],
  providers: [TechnicianAuthService, TechnicianJwtStrategy],
  exports: [TechnicianAuthService],
})
export class TechnicianAuthModule {}
