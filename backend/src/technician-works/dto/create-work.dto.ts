import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkDto {
  @ApiProperty({ description: '作品标题', example: '夏日樱花美甲' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '封面图片URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '图片列表(JSON字符串)' })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return JSON.stringify(value);
    return value;
  })
  @IsOptional()
  @IsString()
  images?: string;

  @ApiPropertyOptional({
    description: '作品描述',
    example: '精致的日式樱花设计',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '标签(逗号分隔)',
    example: '日式,樱花,简约',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(',');
    return value;
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: '价格', example: 199 })
  @Transform(({ value, obj }) => value ?? obj.price)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: '是否可见', example: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: '排序权重', example: 0 })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateWorkDto {
  @ApiPropertyOptional({ description: '作品标题', example: '夏日樱花美甲' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '封面图片URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '图片列表(JSON字符串)' })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return JSON.stringify(value);
    return value;
  })
  @IsOptional()
  @IsString()
  images?: string;

  @ApiPropertyOptional({
    description: '作品描述',
    example: '精致的日式樱花设计',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '标签(逗号分隔)',
    example: '日式,樱花,简约',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(',');
    return value;
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: '价格', example: 199 })
  @Transform(({ value, obj }) => value ?? obj.price)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: '是否可见', example: true })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: '排序权重', example: 0 })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
