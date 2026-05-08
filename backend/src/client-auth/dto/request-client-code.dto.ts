import { IsNotEmpty, IsString } from 'class-validator';

export class RequestClientLoginCodeDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;
}

export class RequestClientRegisterCodeDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '邀请码不能为空' })
  inviteCode: string;
}
