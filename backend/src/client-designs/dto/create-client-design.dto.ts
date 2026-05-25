import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDesignDto {
  @ApiPropertyOptional({ description: '设计标题', example: '粉色渐变美甲' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: '设计描述',
    example: '适合夏天的清新款式',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '指定美甲师ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  techId?: number;

  @ApiProperty({
    description: '图片URL列表',
    example: ['https://example.com/1.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  imageUrls!: string[];
}
