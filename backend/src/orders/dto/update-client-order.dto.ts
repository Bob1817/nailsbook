import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientOrderDto {
  @ApiPropertyOptional({ description: '上门地址ID；到店预约修改时间时不需要', example: 1 })
  @IsOptional()
  @IsInt()
  addressId?: number;

  @ApiProperty({ description: '服务日期', example: '2024-01-15' })
  @IsString()
  serviceDate: string;

  @ApiProperty({ description: '开始时间', example: '14:00' })
  @IsString()
  startTime: string;
}
