import {
  IsArray,
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

  // 工作时间方案（含 schemes/activeSchemeId/restDays 或旧版 days/selectedDates）。
  // 必须在此声明，否则全局 ValidationPipe(whitelist:true) 会剥离该字段导致排期无法保存。
  @ApiPropertyOptional({ description: '工作时间方案' })
  @IsOptional()
  @IsObject()
  serviceSchedule?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '自定义标签' })
  @IsOptional()
  @IsArray()
  customTags?: unknown[];
}
