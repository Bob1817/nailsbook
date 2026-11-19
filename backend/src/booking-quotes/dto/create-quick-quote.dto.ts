import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuickQuoteItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  priceFen: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;
}

export class CreateQuickQuoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickQuoteItemDto)
  items: QuickQuoteItemDto[];

  @IsInt()
  @Min(0)
  finalPriceFen: number;

  @IsOptional()
  @IsString()
  themeCode?: string;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsString()
  technicianPhone?: string;

  @IsOptional()
  @IsString()
  shopName?: string;

  @IsOptional()
  @IsString()
  adjustmentNote?: string;
}
