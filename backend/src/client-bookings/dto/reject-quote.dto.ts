import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectQuoteDto {
  @ApiProperty({ description: '拒绝原因', example: '价格太高' })
  @IsString()
  @MinLength(1)
  reason: string;
}
