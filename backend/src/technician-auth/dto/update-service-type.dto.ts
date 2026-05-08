import { ArrayUnique, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ShopBusinessHourDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  start: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  end: string;

  @IsBoolean()
  @IsOptional()
  closed?: boolean;
}

export class ShopAddressDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  detailAddress?: string;

  @IsString()
  @IsOptional()
  doorInfo?: string;

  @IsString()
  @IsOptional()
  latitude?: string;

  @IsString()
  @IsOptional()
  longitude?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShopBusinessHourDto)
  @ArrayUnique((item: ShopBusinessHourDto) => item.weekday)
  businessHours?: ShopBusinessHourDto[];
}

export class UpdateTechnicianServiceTypeDto {
  @IsBoolean()
  homeService: boolean;

  @IsBoolean()
  shopService: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShopAddressDto)
  shopAddresses?: ShopAddressDto[];
}
