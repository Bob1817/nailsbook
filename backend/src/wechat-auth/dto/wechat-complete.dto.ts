import { WorkShareRegistrationDto } from '../../common/work-share-registration';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

class WechatPhoneBaseDto extends WorkShareRegistrationDto {
  @ApiProperty({ description: '微信登录接口返回的短期绑定凭证' })
  @IsString()
  @MinLength(1)
  wechatSessionToken: string;

  @ApiProperty({ description: 'getPhoneNumber 回调返回的一次性 code' })
  @IsString()
  @MinLength(1)
  phoneCode: string;
}

export class WechatClientCompleteDto extends WechatPhoneBaseDto {
  @ApiPropertyOptional({ description: '美甲师邀请码；新客户必填' })
  @IsOptional()
  @IsString()
  inviteCode?: string;

  @ApiPropertyOptional({ enum: ['invite', 'card'] })
  @IsOptional()
  @IsString()
  source?: string;
}

export class WechatTechnicianCompleteDto extends WechatPhoneBaseDto {
  @ApiPropertyOptional({ description: '管理员邀请密钥；新美甲师必填' })
  @IsOptional()
  @IsString()
  inviteKey?: string;

  @ApiPropertyOptional({ description: '姓名；新美甲师必填' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '备用密码；新美甲师必填' })
  @IsOptional()
  @IsString()
  @IsStrongPassword()
  password?: string;
}
