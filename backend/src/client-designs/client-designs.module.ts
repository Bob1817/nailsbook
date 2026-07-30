import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientDesignsController } from './client-designs.controller';
import { TechnicianDesignsController } from './technician-designs.controller';
import { ClientDesignsService } from './client-designs.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClientDesignsController, TechnicianDesignsController],
  providers: [ClientDesignsService],
})
export class ClientDesignsModule {}
