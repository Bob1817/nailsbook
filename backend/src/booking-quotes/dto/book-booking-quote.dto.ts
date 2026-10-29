import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class BookBookingQuoteDto {
  @IsOptional() @IsInt() @Min(0) expectedHomeServiceFeeFen?: number;
  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
