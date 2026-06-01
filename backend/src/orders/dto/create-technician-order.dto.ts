import {
  IsInt, IsString, IsOptional, IsDateString, IsBoolean, IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTechnicianOrderDto {
  @ApiPropertyOptional({ description: '客户ID（Customer表）', example: 1 })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({ description: '客户用户ID（从聊天发起时使用）', example: 5 })
  @IsOptional()
  @IsInt()
  clientUserId?: number;

  @ApiProperty({ description: '服务名称', example: '基础美甲护理' })
  @IsString()
  serviceName: string;

  @ApiProperty({ description: '开始时间 ISO 8601', example: '2026-06-02T14:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: '结束时间 ISO 8601', example: '2026-06-02T16:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: '服务地址', example: '上海市浦东新区张江路100号' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: '服务类型', example: '上门美甲' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: '自定义服务说明（聊天预约）' })
  @IsOptional()
  @IsString()
  customDescription?: string;

  @ApiPropertyOptional({ description: '参考图片 URL 列表' })
  @IsOptional()
  customImages?: string[];

  @ApiPropertyOptional({ description: '约定价格（元）。shareToClient=true 时必填', example: 180 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '是否生成微信确认链接', example: true })
  @IsOptional()
  @IsBoolean()
  shareToClient?: boolean;
}
