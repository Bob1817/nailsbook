import { IsString, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShopAddressDto {
  @IsString()
  name: string;
}

export class CreateClientOrderDto {
  @IsInt()
  techId: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;

  @IsString()
  serviceType: string;

  @IsOptional()
  @IsInt()
  addressId?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedServiceIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ShopAddressDto)
  shopAddress?: ShopAddressDto;
}
