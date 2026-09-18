import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginAndBindDto {
  @ApiProperty({ description: '手机号', example: '13800138001' })
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '密码', example: 'demo1234' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;

  @ApiProperty({ description: '要绑定的美甲师ID', example: 1 })
  @Type(() => Number)
  @IsInt({ message: '美甲师ID必须是整数' })
  @Min(1)
  techId: number;

  @ApiPropertyOptional({ description: '来源标识', example: 'work_share' })
  @IsOptional()
  @IsString()
  source?: string;
}
