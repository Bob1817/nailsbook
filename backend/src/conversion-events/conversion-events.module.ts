import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ConversionEventsController } from './conversion-events.controller';
import { ConversionEventsService } from './conversion-events.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConversionEventsController],
  providers: [ConversionEventsService],
  exports: [ConversionEventsService],
})
export class ConversionEventsModule {}
