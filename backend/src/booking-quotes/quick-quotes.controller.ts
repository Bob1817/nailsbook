import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateQuickQuoteDto } from './dto/create-quick-quote.dto';
import { QuickQuotesService } from './quick-quotes.service';

@Controller('public/quick-quotes')
export class PublicQuickQuotesController {
  constructor(private readonly quickQuotes: QuickQuotesService) {}

  @Post()
  create(@Body() dto: CreateQuickQuoteDto) {
    return this.quickQuotes.create(dto);
  }

  @Get(':token')
  detail(@Param('token') token: string) {
    return this.quickQuotes.getPublicDetail(token);
  }
}
