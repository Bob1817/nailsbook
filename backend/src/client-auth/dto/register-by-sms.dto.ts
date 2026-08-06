import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBySmsDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '短信验证码' })
  @IsString()
  @IsNotEmpty({ message: '请输入验证码' })
  smsCode: string;

  @ApiPropertyOptional({ description: '用户昵称', example: '小美' })
  @IsOptional()
  @IsString()
  nickname?: string;
}
