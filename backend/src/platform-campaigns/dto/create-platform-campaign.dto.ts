import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlatformCampaignDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(['all', 'client', 'technician', 'guest'])
  targetAudience?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  displayLocations?: string[];

  @IsOptional()
  @IsIn(['page', 'internal_link', 'external_link'])
  actionType?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string | null;

  @IsOptional()
  @IsDateString()
  endTime?: string | null;

  @IsOptional()
  @IsIn(['draft', 'active', 'offline', 'ended'])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
