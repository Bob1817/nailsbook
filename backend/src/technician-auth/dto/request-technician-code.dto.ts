import { IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestTechnicianCodeDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsNotEmpty()
  @IsPhoneNumber('CN')
  phone: string;
}
