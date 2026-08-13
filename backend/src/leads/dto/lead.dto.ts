import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LEAD_STATUSES, LOST_REASONS } from '../lead-rules';

export class UpdateLeadStatusDto {
  @IsIn(LEAD_STATUSES) status: string;
  @IsOptional() @IsIn(LOST_REASONS) lostReason?: string;
  @IsOptional() @IsString() @MaxLength(200) lostReasonNote?: string;
  @IsOptional() @IsDateString() nextFollowUpAt?: string;
  @IsOptional() @IsInt() @Min(1) orderId?: number;
}
export class CreateLeadFollowUpDto {
  @IsString() @MaxLength(1000) content: string;
  @IsOptional() @IsDateString() nextFollowUpAt?: string;
}
export class CreateTechnicianLeadDto {
  @IsString() @MaxLength(30) nickname: string;
  @IsString() @MaxLength(80) contact: string;
  @IsOptional() @IsString() @MaxLength(1000) requirement?: string;
  @IsOptional() @IsString() @MaxLength(40) budget?: string;
  @IsOptional() @IsDateString() expectedDate?: string;
  @IsOptional() @IsDateString() nextFollowUpAt?: string;
  @IsOptional() @IsInt() @Min(1) workId?: number;
}
