import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientDesignDto {
  @ApiPropertyOptional({ description: '设计标题', example: '粉色渐变美甲' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: '设计描述',
    example: '适合夏天的清新款式',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
