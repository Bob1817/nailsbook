import { IsNotEmpty, IsString } from 'class-validator';

export class ClientLoginDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code: string;
}
