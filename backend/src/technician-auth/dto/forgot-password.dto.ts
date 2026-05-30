import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class ForgotSendCodeDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;
}

export class ForgotResetDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '短信验证码' })
  @IsString()
  @IsNotEmpty({ message: '请输入验证码' })
  code: string;

  @ApiProperty({ description: '新密码（至少 8 位，含字母和数字）' })
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}
