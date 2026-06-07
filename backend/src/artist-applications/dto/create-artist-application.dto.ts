import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArtistApplicationDto {
  @ApiProperty({ description: '申请人姓名', example: '张三' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '联系电话', example: '13800138000' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '所在城市', example: '上海' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ description: '服务模式', example: '上门服务' })
  @IsString()
  @IsOptional()
  serviceMode?: string;

  @ApiPropertyOptional({ description: '从业经验', example: '3年' })
  @IsString()
  @IsOptional()
  experience?: string;

  @ApiPropertyOptional({ description: '擅长领域', example: '法式美甲' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ description: '微信号（用于发放激活码）', example: 'wxid_abc123' })
  @IsString()
  @IsOptional()
  wechat?: string;

  @ApiPropertyOptional({ description: '备注说明' })
  @IsString()
  @IsOptional()
  note?: string;
}
