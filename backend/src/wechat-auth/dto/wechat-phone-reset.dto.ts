import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

/** 项目未接入短信服务：找回密码 / 首次设密改用微信手机号授权验证。 */
export class WechatPhoneResetDto {
  @ApiProperty({ description: '要重置/设密的手机号', example: '13800138000' })
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: 'getPhoneNumber 回调返回的一次性 code' })
  @IsString()
  @MinLength(1)
  phoneCode: string;

  @ApiProperty({ description: '新密码（至少 8 位，含字母和数字）' })
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}
