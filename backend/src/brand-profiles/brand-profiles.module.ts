import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianAuthModule } from '../technician-auth/technician-auth.module';
import { BrandProfilesService } from './brand-profiles.service';
import {
  PublicBrandProfileController,
  TechnicianBrandProfileController,
} from './brand-profiles.controller';

@Module({
  imports: [PrismaModule, TechnicianAuthModule],
  controllers: [TechnicianBrandProfileController, PublicBrandProfileController],
  providers: [BrandProfilesService],
  exports: [BrandProfilesService],
})
export class BrandProfilesModule {}
