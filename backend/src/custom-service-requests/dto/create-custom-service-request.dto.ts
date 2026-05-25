import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ShopAddressDto {
  @ApiProperty({ description: '收件人姓名', example: '张三' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '联系电话', example: '13800138000' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '省份', example: '浙江省' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ description: '城市', example: '杭州市' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: '区/县', example: '西湖区' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: '详细地址', example: '文三路123号' })
  @IsString()
  @IsOptional()
  detailAddress?: string;

  @ApiPropertyOptional({
    description: '门牌号/楼层信息',
    example: '3栋2单元502',
  })
  @IsString()
  @IsOptional()
  doorInfo?: string;
}

export class CreateCustomServiceRequestDto {
  @ApiProperty({ description: '美甲师ID', example: 1 })
  @Transform(({ value, obj }) => value ?? obj.tech_id)
  @IsInt()
  @Min(1)
  techId: number;

  @ApiPropertyOptional({ description: '请求标题', example: '定制节日美甲' })
  @Transform(({ value, obj }) => value ?? obj.title)
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: '请求描述',
    example: '想要一款圣诞节主题的美甲',
  })
  @Transform(({ value, obj }) => value ?? obj.description)
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '参考图片URL列表',
    example: ['https://example.com/1.jpg'],
  })
  @Transform(({ value, obj }) => value ?? obj.images ?? [])
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: '参考作品ID列表', example: [1, 2] })
  @Transform(({ value, obj }) => value ?? obj.reference_work_ids ?? [])
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  referenceWorkIds?: number[];

  @ApiPropertyOptional({ description: '期望服务日期', example: '2024-01-15' })
  @Transform(({ value, obj }) => value ?? obj.service_date)
  @IsString()
  @IsOptional()
  serviceDate?: string;

  @ApiPropertyOptional({ description: '期望开始时间', example: '14:00' })
  @Transform(({ value, obj }) => value ?? obj.start_time)
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: '服务类型', example: '到店' })
  @Transform(({ value, obj }) => value ?? obj.service_type)
  @IsString()
  @IsOptional()
  serviceType?: string;

  @ApiPropertyOptional({ description: '地址ID（上门服务时使用）', example: 1 })
  @Transform(({ value, obj }) => Number(value ?? obj.address_id))
  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;

  @ApiPropertyOptional({ description: '店铺地址（到店服务时使用）' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShopAddressDto)
  shopAddress?: ShopAddressDto;
}
