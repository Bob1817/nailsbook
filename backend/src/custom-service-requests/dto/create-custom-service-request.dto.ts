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

export class CreateCustomServiceRequestDto {
  @Transform(({ value, obj }) => value ?? obj.tech_id)
  @IsInt()
  @Min(1)
  techId: number;

  @Transform(({ value, obj }) => value ?? obj.title)
  @IsString()
  @IsOptional()
  title?: string;

  @Transform(({ value, obj }) => value ?? obj.description)
  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value, obj }) => value ?? obj.images ?? [])
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @Transform(({ value, obj }) => value ?? obj.reference_work_ids ?? [])
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  referenceWorkIds?: number[];

  @Transform(({ value, obj }) => value ?? obj.service_date)
  @IsString()
  @IsOptional()
  serviceDate?: string;

  @Transform(({ value, obj }) => value ?? obj.start_time)
  @IsString()
  @IsOptional()
  startTime?: string;

  @Transform(({ value, obj }) => value ?? obj.service_type)
  @IsString()
  @IsOptional()
  serviceType?: string;

  @Transform(({ value, obj }) => Number(value ?? obj.address_id))
  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShopAddressDto)
  shopAddress?: ShopAddressDto;
}
