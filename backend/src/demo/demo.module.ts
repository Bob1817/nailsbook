import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../common/prisma/prisma.module';
import { DemoAdminController } from './demo-admin.controller';
import { DemoController } from './demo.controller';
import { DemoPolicyInterceptor } from './demo.policy.interceptor';
import { DemoService } from './demo.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('TECHNICIAN_JWT_SECRET') ??
          configService.get<string>('JWT_SECRET') ??
          'demo-fallback-secret',
        signOptions: { expiresIn: '4h' },
      }),
    }),
  ],
  controllers: [DemoController, DemoAdminController],
  providers: [DemoService, DemoPolicyInterceptor],
  exports: [DemoService, DemoPolicyInterceptor],
})
export class DemoModule {}
