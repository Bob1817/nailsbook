import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShopBusinessHourDto {
  @ApiProperty({ description: '星期几(0-6)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ description: '开始时间', example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  start: string;

  @ApiProperty({ description: '结束时间', example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  end: string;

  @ApiPropertyOptional({ description: '是否休息', example: false })
  @IsBoolean()
  @IsOptional()
  closed?: boolean;
}

export class ShopAddressDto {
  @ApiProperty({ description: '店铺名称', example: '美甲工作室' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '联系电话', example: '13800138000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '省份', example: '上海市' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ description: '城市', example: '上海' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: '区', example: '浦东新区' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: '详细地址', example: '张江高科技园区' })
  @IsString()
  @IsOptional()
  detailAddress?: string;

  @ApiPropertyOptional({ description: '门牌信息', example: 'A栋3楼' })
  @IsString()
  @IsOptional()
  doorInfo?: string;

  @ApiPropertyOptional({ description: '纬度', example: '31.2304' })
  @IsString()
  @IsOptional()
  latitude?: string;

  @ApiPropertyOptional({ description: '经度', example: '121.4737' })
  @IsString()
  @IsOptional()
  longitude?: string;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '营业时间列表',
    type: [ShopBusinessHourDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShopBusinessHourDto)
  @ArrayUnique((item: ShopBusinessHourDto) => item.weekday)
  businessHours?: ShopBusinessHourDto[];
}

export class UpdateTechnicianServiceTypeDto {
  @ApiProperty({ description: '是否提供上门服务', example: true })
  @IsBoolean()
  homeService: boolean;

  @ApiProperty({ description: '是否提供到店服务', example: true })
  @IsBoolean()
  shopService: boolean;

  @ApiPropertyOptional({ description: '店铺地址列表', type: [ShopAddressDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShopAddressDto)
  shopAddresses?: ShopAddressDto[];
}
