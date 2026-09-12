import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectQuoteDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  quoteVersion?: number;

  @ApiProperty({ description: '拒绝原因', example: '价格太高' })
  @IsString()
  reason: string;
}
