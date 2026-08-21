import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { LeadsController, PublicInquiriesController } from './leads.controller';
import { LeadsService } from './leads.service';
@Module({
  imports: [PrismaModule],
  controllers: [LeadsController, PublicInquiriesController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
