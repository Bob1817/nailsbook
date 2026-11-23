import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateErrorReportDto {
  @ApiPropertyOptional({ description: '来源', default: 'mini_program' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: '错误类型', example: 'js_error' })
  @IsNotEmpty()
  @IsString()
  errorType: string;

  @ApiProperty({ description: '错误信息' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '堆栈' })
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiPropertyOptional({ description: '发生页面或接口路径' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ description: 'HTTP 方法' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'HTTP 状态码' })
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @ApiPropertyOptional({ description: '用户角色' })
  @IsOptional()
  @IsString()
  userRole?: string;

  @ApiPropertyOptional({ description: '用户 ID' })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: '终端设备信息 JSON' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiPropertyOptional({ description: '网络类型' })
  @IsOptional()
  @IsString()
  networkType?: string;
}
