import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteServiceSelectionDto {
  @ApiProperty({ description: '服务公开 ID' })
  @IsString()
  servicePublicId: string;

  @ApiPropertyOptional({ description: '数量', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  quantity?: number;
}

export class ReviewOrderDto {
  @ApiProperty({ description: '构成报价的基础服务' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteServiceSelectionDto)
  services: QuoteServiceSelectionDto[];

  @ApiProperty({ description: '服务日期', example: '2026-05-15' })
  @IsString()
  serviceDate: string;

  @ApiProperty({ description: '开始时间', example: '10:00' })
  @IsString()
  startTime: string;

  @ApiPropertyOptional({ description: '优惠金额（分）', example: 2000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountAmountFen?: number;

  @ApiPropertyOptional({ description: '备注', example: '请准时到达' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: '定金金额', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ description: '定金是否已确认支付' })
  @IsOptional()
  @IsBoolean()
  isDepositPaid?: boolean;
}
