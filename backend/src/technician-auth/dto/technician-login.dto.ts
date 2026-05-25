import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TechnicianLoginDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @ApiProperty({ description: '验证码', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  password: string;
}
