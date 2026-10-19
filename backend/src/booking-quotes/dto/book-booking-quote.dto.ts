import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class BookBookingQuoteDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
