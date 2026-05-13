import { IsString, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShopAddressFromDesignDto {
  @IsString()
  name: string;
}

export class CreateOrderFromDesignDto {
  @IsInt()
  designId: number;

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
  @ValidateNested()
  @Type(() => ShopAddressFromDesignDto)
  shopAddress?: ShopAddressFromDesignDto;
}
