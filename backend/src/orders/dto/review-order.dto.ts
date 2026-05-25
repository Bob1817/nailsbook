import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewOrderDto {
  @ApiProperty({ description: '报价金额', example: 199 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: '服务日期', example: '2026-05-15' })
  @IsString()
  serviceDate: string;

  @ApiProperty({ description: '开始时间', example: '10:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '服务时长(分钟)', example: 120 })
  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @ApiPropertyOptional({ description: '备注', example: '请准时到达' })
  @IsOptional()
  @IsString()
  remark?: string;
}
