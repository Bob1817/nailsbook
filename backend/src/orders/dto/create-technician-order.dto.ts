import { IsInt, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTechnicianOrderDto {
  @ApiProperty({ description: '客户ID', example: 1 })
  @IsInt()
  customerId: number;

  @ApiProperty({ description: '服务名称', example: '基础美甲护理' })
  @IsString()
  serviceName: string;

  @ApiProperty({ description: '开始时间', example: '2026-05-15T10:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: '结束时间', example: '2026-05-15T12:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: '服务地址',
    example: '上海市浦东新区张江路100号',
  })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: '服务类型', example: '上门服务' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: '备注', example: '请准备粉色系甲油' })
  @IsOptional()
  @IsString()
  note?: string;
}
