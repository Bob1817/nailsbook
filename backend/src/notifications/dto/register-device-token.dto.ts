import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'FCM 设备 token' })
  @IsString()
  token: string;

  @ApiProperty({ description: '平台', example: 'ios' })
  @IsIn(['ios', 'android'])
  platform: string;

  @ApiPropertyOptional({ description: '角色（由后端按登录态决定，可忽略）' })
  @IsOptional()
  @IsString()
  role?: string;
}
