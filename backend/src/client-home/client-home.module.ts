import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientHomeController } from './client-home.controller';
import { ClientHomeService } from './client-home.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClientHomeController],
  providers: [ClientHomeService],
})
export class ClientHomeModule {}
