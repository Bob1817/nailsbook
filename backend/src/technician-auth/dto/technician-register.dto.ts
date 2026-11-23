import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/password.validator';

export class TechnicianRegisterDto {
  @ApiPropertyOptional({ description: '推荐码（选填，用于追踪渠道来源）', example: 'A3F9K2M7N5P4Q8R1' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{16}$/, { message: '推荐码格式不正确' })
  inviteKey?: string;

  @ApiProperty({ description: '姓名', example: '小美' })
  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  name: string;

  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '密码（至少 8 位，含字母和数字）' })
  @IsString()
  @IsStrongPassword()
  password: string;
}
