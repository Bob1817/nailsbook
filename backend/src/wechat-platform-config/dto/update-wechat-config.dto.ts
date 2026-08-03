import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

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

  @IsUrl({ require_protocol: true, protocols: ['https'] })
  paymentNotifyUrl: string;
}
