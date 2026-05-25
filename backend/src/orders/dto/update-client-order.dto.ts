import { IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClientOrderDto {
  @ApiProperty({ description: '地址ID', example: 1 })
  @IsInt()
  addressId: number;

  @ApiProperty({ description: '服务日期', example: '2024-01-15' })
  @IsString()
  serviceDate: string;

  @ApiProperty({ description: '开始时间', example: '14:00' })
  @IsString()
  startTime: string;
}
