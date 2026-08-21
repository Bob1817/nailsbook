import { Body, Controller, Post } from '@nestjs/common';
import { ConversionEventsService } from './conversion-events.service';
import { RecordConversionEventDto } from './dto/record-conversion-event.dto';

@Controller('public/conversion-events')
export class ConversionEventsController {
  constructor(private readonly service: ConversionEventsService) {}

  @Post()
  record(@Body() dto: RecordConversionEventDto) {
    return this.service.recordPublic(dto);
  }
}
