import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class SetPasswordDto {
  @ApiProperty({ description: '新密码（至少 8 位，含字母和数字）' })
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}
