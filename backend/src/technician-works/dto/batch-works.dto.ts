import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class BatchWorksDto {
  @ApiProperty({ description: '作品 ID 列表', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  workIds: number[];

  @ApiProperty({
    description: '批量操作类型',
    enum: ['show', 'hide', 'delete', 'add_tags', 'remove_tags', 'update_price'],
  })
  @IsIn(['show', 'hide', 'delete', 'add_tags', 'remove_tags', 'update_price'])
  action: 'show' | 'hide' | 'delete' | 'add_tags' | 'remove_tags' | 'update_price';

  @ApiPropertyOptional({ description: '标签列表（add_tags/remove_tags 时使用）', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '统一价格（update_price 时使用）' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price?: number;
}

export class ReorderWorksDto {
  @ApiProperty({ description: '按新顺序排列的作品 ID 列表', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  orderedWorkIds: number[];
}
