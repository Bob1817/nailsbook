import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class RegisterByInviteDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '密码（至少 8 位，含字母和数字）' })
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ description: '美甲师邀请码', example: 'A3F9K2M7' })
  @IsString()
  @IsNotEmpty({ message: '邀请码不能为空' })
  inviteCode: string;

  @ApiPropertyOptional({ description: '用户昵称', example: '小美' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '注册来源', enum: ['invite', 'card'] })
  @IsOptional()
  @IsIn(['invite', 'card'])
  source?: 'invite' | 'card';
}
