import { WorkShareRegistrationDto } from '../../common/work-share-registration';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

class WechatPhoneBaseDto extends WorkShareRegistrationDto {
  @ApiProperty({ description: '微信登录接口返回的短期绑定凭证' })
  @IsString()
  @MinLength(1)
  wechatSessionToken: string;

  @ApiPropertyOptional({ description: 'getPhoneNumber 回调返回的一次性 code' })
  @ValidateIf((o) => !o.conversionToken)
  @IsString()
  @MinLength(1)
  phoneCode?: string;
}

export class WechatClientCompleteDto extends WechatPhoneBaseDto {
  @ApiPropertyOptional({ description: '一键预约的美甲师ID，必须与邀请码匹配' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quickBookingTechId?: number;

  @ApiPropertyOptional({ description: '美甲师邀请码；新客户必填' })
  @IsOptional()
  @IsString()
  inviteCode?: string;

  @ApiPropertyOptional({ enum: ['invite', 'card'] })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ enum: ['client', 'technician'] })
  @IsOptional()
  @IsIn(['client', 'technician'])
  targetRole?: 'client' | 'technician';

  @ApiPropertyOptional({ description: '确认将美甲师账号注销并转换为客户账号' })
  @IsOptional()
  @IsBoolean()
  confirmTechnicianConversion?: boolean;

  @ApiPropertyOptional({ description: '首次返回需确认角色转换时签发的短期凭证' })
  @IsOptional()
  @IsString()
  conversionToken?: string;
}

export class WechatTechnicianCompleteDto extends WechatPhoneBaseDto {
  @ApiPropertyOptional({ description: '推荐码（选填，用于追踪渠道来源）' })
  @IsOptional()
  @IsString()
  inviteKey?: string;

  @ApiPropertyOptional({ description: '姓名；新美甲师必填' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '备用密码（选填，不填则仅限微信登录）' })
  @IsOptional()
  @IsString()
  @IsStrongPassword()
  password?: string;
}
