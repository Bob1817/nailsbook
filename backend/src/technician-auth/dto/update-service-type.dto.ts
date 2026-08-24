import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
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

export class ShopGuidanceBlockDto {
  @ApiProperty({ description: '内容块类型', enum: ['text', 'image'] })
  @IsString()
  @IsIn(['text', 'image'])
  type: 'text' | 'image';

  @ApiPropertyOptional({ description: '内容块标识' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: '文字内容' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: '图片 URL' })
  @IsString()
  @IsOptional()
  url?: string;
}

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

export class ShopGuidanceSectionDto {
  @ApiPropertyOptional({ description: '按展示顺序排列的文字和图片内容块', type: [ShopGuidanceBlockDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShopGuidanceBlockDto)
  blocks?: ShopGuidanceBlockDto[];

  @ApiPropertyOptional({ description: '指引文字', example: '2 号线南京西路站 1 号口出，步行 3 分钟' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: '指引图片 URL 列表', type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];
}

export class ShopGuidanceDto {
  @ApiPropertyOptional({ description: '是否开启地址指引', example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '地铁指引', type: ShopGuidanceSectionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShopGuidanceSectionDto)
  metro?: ShopGuidanceSectionDto;

  @ApiPropertyOptional({ description: '公交指引', type: ShopGuidanceSectionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShopGuidanceSectionDto)
  bus?: ShopGuidanceSectionDto;

  @ApiPropertyOptional({ description: '开车指引', type: ShopGuidanceSectionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShopGuidanceSectionDto)
  driving?: ShopGuidanceSectionDto;
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

  @ApiPropertyOptional({ description: '店铺地址指引（地铁/公交/开车）', type: ShopGuidanceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShopGuidanceDto)
  guidance?: ShopGuidanceDto;
}

export class UpdateTechnicianServiceTypeDto {
  // 局部更新：各入口（上门设置 / 到店设置 / 店铺地址）只提交各自字段，
  // 未提交的字段保持不变，因此均为可选。
  @ApiPropertyOptional({ description: '是否提供上门服务', example: true })
  @IsBoolean()
  @IsOptional()
  homeService?: boolean;

  @ApiPropertyOptional({ description: '是否提供到店服务', example: true })
  @IsBoolean()
  @IsOptional()
  shopService?: boolean;

  @ApiPropertyOptional({ description: '店铺地址列表', type: [ShopAddressDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShopAddressDto)
  shopAddresses?: ShopAddressDto[];
}
