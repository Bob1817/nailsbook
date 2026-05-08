import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ShopAddressDto {
  @IsString()
  @IsNotEmpty()
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
}

export class CreateClientBookingDto {
  @Transform(({ value, obj }) => value ?? obj.service_date)
  @IsString()
  @IsNotEmpty()
  serviceDate: string;

  @Transform(({ value, obj }) => value ?? obj.start_time)
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @Transform(({ value, obj }) => Number(value ?? obj.address_id))
  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;

  @Transform(({ value, obj }) => Number(value ?? obj.tech_id))
  @IsInt()
  @Min(1)
  techId: number;

  @Transform(({ value, obj }) => value ?? obj.service_type)
  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @Transform(({ value, obj }) => value ?? obj.remark)
  @IsOptional()
  @IsString()
  remark?: string;

  @Transform(({ value, obj }) => value ?? obj.selected_service_ids ?? [])
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedServiceIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ShopAddressDto)
  shopAddress?: ShopAddressDto;
}
