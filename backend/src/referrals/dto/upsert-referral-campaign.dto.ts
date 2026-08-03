import {
  IsDateString,
  IsIn,
  IsNumber,
  Min,
} from 'class-validator';

export class UpsertReferralCampaignDto {
  @IsNumber()
  @Min(0)
  rewardAmount: number;

  @IsNumber()
  @Min(0)
  minimumOrderAmount: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
