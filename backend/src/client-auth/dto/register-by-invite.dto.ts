import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterByInviteDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: '美甲师ID必须是整数' })
  techId?: number;

  @IsString()
  @IsNotEmpty({ message: '邀请码不能为空' })
  inviteCode: string;
}
