import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WechatLoginDto {
  @ApiProperty({ description: 'wx.login 返回的一次性 code' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiPropertyOptional({ enum: ['client', 'technician'] })
  @IsOptional()
  @IsIn(['client', 'technician'])
  role?: 'client' | 'technician';
}
