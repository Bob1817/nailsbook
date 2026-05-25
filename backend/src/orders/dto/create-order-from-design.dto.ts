import { IsString, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ShopAddressFromDesignDto {
  @ApiProperty({ description: '店铺名称', example: '美甲工作室' })
  @IsString()
  name: string;
}

export class CreateOrderFromDesignDto {
  @ApiProperty({ description: '设计ID', example: 1 })
  @IsInt()
  designId: number;

  @ApiProperty({ description: '美甲师ID', example: 1 })
  @IsInt()
  techId: number;

  @ApiProperty({ description: '服务日期', example: '2024-01-15' })
  @IsString()
  serviceDate: string;

  @ApiProperty({ description: '开始时间', example: '14:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '服务类型', example: '到店' })
  @IsString()
  serviceType: string;

  @ApiPropertyOptional({ description: '地址ID（上门服务时使用）', example: 1 })
  @IsOptional()
  @IsInt()
  addressId?: number;

  @ApiPropertyOptional({ description: '店铺地址（到店服务时使用）' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShopAddressFromDesignDto)
  shopAddress?: ShopAddressFromDesignDto;
}
