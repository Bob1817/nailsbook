import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PublicationConsentsController } from './publication-consents.controller';
import { PublicationConsentsService } from './publication-consents.service';
@Module({
  imports: [PrismaModule],
  controllers: [PublicationConsentsController],
  providers: [PublicationConsentsService],
})
export class PublicationConsentsModule {}
