import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTechnicianDto {
  @ApiPropertyOptional({ description: '美甲师姓名' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '手机号码' })
  @IsOptional()
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '所在城市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '服务区域' })
  @IsOptional()
  @IsString()
  serviceArea?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive', 'suspended'] })
  @IsOptional()
  @IsString()
  status?: string;
}
