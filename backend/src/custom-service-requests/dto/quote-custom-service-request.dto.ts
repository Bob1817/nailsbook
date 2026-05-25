import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteCustomServiceRequestDto {
  @ApiProperty({ description: '报价金额', example: 299 })
  @Transform(({ value, obj }) => Number(value ?? obj.price))
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiPropertyOptional({ description: '备注', example: '包含材料费' })
  @Transform(({ value, obj }) => value ?? obj.remark)
  @IsString()
  @IsOptional()
  remark?: string;
}
