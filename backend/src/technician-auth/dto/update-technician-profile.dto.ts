import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTechnicianProfileDto {
  @ApiPropertyOptional({ description: '姓名', example: '张美甲' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: '城市', example: '上海' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @ApiPropertyOptional({ description: '服务区域', example: '浦东新区' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  serviceArea?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @Matches(/^(https?:\/\/.+|\/uploads\/.+)$/i, {
    message: '头像地址格式不正确',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '社交媒体链接' })
  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>;
}
