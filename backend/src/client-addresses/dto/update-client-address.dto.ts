import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientAddressDto {
  @ApiPropertyOptional({ description: '联系人姓名', example: '张三' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: '联系人电话', example: '13800138000' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: '省份', example: '广东省' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: '城市', example: '深圳市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '区/县', example: '南山区' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: '详细地址', example: '科技园南路XX号' })
  @IsOptional()
  @IsString()
  detailAddress?: string;

  @ApiPropertyOptional({ description: '门牌号信息', example: 'A栋1203' })
  @IsOptional()
  @IsString()
  doorInfo?: string;

  @ApiPropertyOptional({ description: '纬度', example: 22.5431 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度', example: 113.9455 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '是否设为默认地址', example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
