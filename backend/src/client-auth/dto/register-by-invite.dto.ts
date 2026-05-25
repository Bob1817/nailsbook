import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterByInviteDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @ApiProperty({ description: '验证码', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code: string;

  @ApiPropertyOptional({ description: '美甲师ID', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: '美甲师ID必须是整数' })
  techId?: number;

  @ApiProperty({ description: '邀请码', example: 'ABC123' })
  @IsString()
  @IsNotEmpty({ message: '邀请码不能为空' })
  inviteCode: string;
}
