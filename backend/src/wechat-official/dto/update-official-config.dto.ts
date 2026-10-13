import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateOfficialConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appId?: string;

  /** 首次配置必填；留空表示沿用已保存的密钥。 */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  appSecret?: string;

  /** 与微信后台「消息推送 - Token」严格一致。 */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  token?: string;

  /** 43 位 EncodingAESKey，与微信后台严格一致。 */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  encodingAesKey?: string;

  @IsOptional()
  @IsIn(['plaintext', 'compatible', 'safe'])
  encryptMode?: 'plaintext' | 'compatible' | 'safe';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  welcomeReply?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fallbackReply?: string;
}
