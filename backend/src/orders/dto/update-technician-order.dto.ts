import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTechnicianOrderDto {
  @ApiPropertyOptional({ description: '服务类型', example: '上门美甲' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: '开始时间', example: '2026-05-15T10:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2026-05-15T12:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: '报价金额', example: 299 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: '备注', example: '请准时到达' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: '定金金额', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;
}
