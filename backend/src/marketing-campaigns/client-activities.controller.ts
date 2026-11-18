import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { MarketingCampaignsService } from './marketing-campaigns.service';

@Controller('client/activities')
export class ClientActivitiesController {
  constructor(private readonly service: MarketingCampaignsService) {}

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getClientActivity(id);
  }
}
