import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested, IsBoolean } from 'class-validator';

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

export class CreateBookingFromDesignDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsNotEmpty()
  designId: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsNotEmpty()
  techId: number;

  @IsString()
  @IsNotEmpty()
  serviceDate: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @Transform(({ value }) => value ? Number(value) : undefined)
  @IsInt()
  @IsOptional()
  addressId?: number;

  @IsOptional()
  @ValidateNested()
  shopAddress?: ShopAddressDto;
}
