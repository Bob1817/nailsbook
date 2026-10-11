import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RepeatBookingDto {
  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
