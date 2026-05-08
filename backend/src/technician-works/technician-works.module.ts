import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TechnicianWorksController } from './technician-works.controller';
import { PublicWorksController } from './public-works.controller';
import { TechnicianWorksService } from './technician-works.service';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicianWorksController, PublicWorksController],
  providers: [TechnicianWorksService],
})
export class TechnicianWorksModule {}
