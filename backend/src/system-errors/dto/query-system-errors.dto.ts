import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QuerySystemErrorsDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '错误来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '错误类型' })
  @IsOptional()
  @IsString()
  errorType?: string;

  @ApiPropertyOptional({ description: '归因分类 (database/server/backend/frontend/other)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '优先级 (P0/P1/P2/P3)' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '是否已解决' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({ description: '开始日期 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class ResolveErrorDto {
  @ApiPropertyOptional({ description: '处理备忘' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BatchResolveErrorDto {
  @ApiPropertyOptional({ description: '错误 ID 列表' })
  @IsArray()
  ids: number[];

  @ApiPropertyOptional({ description: '处理备忘' })
  @IsOptional()
  @IsString()
  note?: string;
}
