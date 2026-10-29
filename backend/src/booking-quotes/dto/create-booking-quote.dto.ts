import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class BookingQuoteLineDto {
  @IsIn(['service', 'material', 'surcharge'])
  lineType: 'service' | 'material' | 'surcharge';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  servicePublicId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  unitPriceFen?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;
}

export class CreateBookingQuoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  clientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requirement?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  referenceImages?: string[];

  @IsOptional()
  @IsIn(['到店美甲', '上门美甲'])
  serviceType?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => BookingQuoteLineDto)
  lines: BookingQuoteLineDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  finalPriceFen?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  totalDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  validDays?: number;
}
