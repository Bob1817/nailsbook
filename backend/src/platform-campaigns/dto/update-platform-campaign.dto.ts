import { PartialType } from '@nestjs/swagger';
import { CreatePlatformCampaignDto } from './create-platform-campaign.dto';

export class UpdatePlatformCampaignDto extends PartialType(CreatePlatformCampaignDto) {}
