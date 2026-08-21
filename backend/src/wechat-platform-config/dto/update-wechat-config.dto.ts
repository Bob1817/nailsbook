import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class UpdateWechatLoginConfigDto {
  @IsBoolean()
  loginEnabled: boolean;

  @IsString()
  miniProgramAppId: string;

  @IsOptional()
  @IsString()
  miniProgramSecret?: string;
}

export class UpdateWechatPaymentConfigDto {
  @IsBoolean()
  paymentEnabled: boolean;

  @IsString()
  merchantId: string;

  @IsString()
  merchantSerialNo: string;

  @IsOptional()
  @IsString()
  merchantPrivateKey?: string;

  @IsOptional()
  @IsString()
  apiV3Key?: string;

  @IsIn(['platform_public_key', 'platform_certificate'])
  paymentVerifierMode: 'platform_public_key' | 'platform_certificate';

  @IsString()
  platformKeyId: string;

  @IsOptional()
  @IsString()
  platformPublicKey?: string;

  @IsString()
  boundAppId: string;

  @IsBoolean()
  bindingConfirmed: boolean;

  @IsUrl({ require_protocol: true, protocols: ['https'] })
  paymentNotifyUrl: string;
}

export class UpdateMiniProgramLaunchConfigDto {
  @IsString() @MaxLength(120) operatorName: string;
  @IsString() @MaxLength(120) storeName: string;
  @IsString() @MaxLength(240) storeAddress: string;
  @IsString() @MaxLength(40) storePhone: string;
  @IsString() @MaxLength(120) privacyContact: string;
  @IsOptional() @IsString() @MaxLength(120) filingNumber?: string;
  @IsInt() @Min(1) launchTechnicianId: number;
  @IsOptional() @IsString() @MaxLength(120) bookingReminderTemplateId?: string;
}
