import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ATTRIBUTION_CHANNELS } from '../../conversion-events/conversion-attribution';

export class SubmitPublicInquiryDto {
  @IsString() @IsNotEmpty() @MaxLength(80) submissionKey: string;
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  technicianId: number;
  @Transform(({ value }) => (value == null ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  workId?: number;
  @IsString() @IsNotEmpty() @MaxLength(30) nickname: string;
  @IsString() @IsNotEmpty() @MaxLength(80) contact: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) requirement: string;
  @IsOptional() @IsString() @MaxLength(40) budget?: string;
  @IsOptional() @IsDateString() expectedDate?: string;
  @IsBoolean() privacyAgreed: boolean;
  @IsOptional() @IsString() @MaxLength(64) visitorId?: string;
  @IsOptional() @IsIn(ATTRIBUTION_CHANNELS) channel?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]+$/)
  @MaxLength(64)
  campaign?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]+$/)
  @MaxLength(64)
  content?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_-]+$/)
  @MaxLength(32)
  touchpoint?: string;
  @IsOptional() @IsString() @MaxLength(64) referral?: string;
}
