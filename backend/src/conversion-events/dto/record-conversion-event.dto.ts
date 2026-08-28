import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export class RecordConversionEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  eventId: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  technicianId: number;

  @Transform(({ value }) => (value == null ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  workId?: number;

  @IsString()
  @IsIn(['artist_view', 'work_view', 'booking_intent', 'poster_saved', 'poster_generated'])
  eventType: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{48}$/)
  shareToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  source?: string;
}
