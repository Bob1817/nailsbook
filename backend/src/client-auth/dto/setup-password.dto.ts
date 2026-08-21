import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class SetupPasswordDto {
  @ApiProperty({ description: '微信登录完成后返回的密码设置 token' })
  @IsString()
  @IsNotEmpty({ message: '缺少密码设置凭证' })
  passwordSetupToken: string;

  @ApiProperty({ description: '新密码（至少 8 位，含字母和数字）' })
  @IsString()
  @IsStrongPassword()
  password: string;
}
