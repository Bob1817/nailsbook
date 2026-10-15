import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateArtistApplicationDto {
  @ApiProperty({ description: '申请人称呼', example: '张三' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '联系电话', example: '13800138000' })
  @Transform(trim)
  @IsString()
  @Matches(/^1[3-9]\d{9}$/)
  phone: string;

  @ApiProperty({ description: '所在城市', example: '上海' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  city: string;

  @ApiPropertyOptional({ description: '服务模式', enum: ['home', 'shop', 'both'] })
  @IsIn(['home', 'shop', 'both'])
  @IsOptional()
  serviceMode?: string;

  @ApiPropertyOptional({ description: '从业经验', example: '3年' })
  @Transform(trim)
  @IsString()
  @IsOptional()
  @MaxLength(200)
  experience?: string;

  @ApiPropertyOptional({ description: '擅长领域', example: '法式美甲' })
  @Transform(trim)
  @IsString()
  @IsOptional()
  @MaxLength(200)
  specialty?: string;

  @ApiPropertyOptional({ description: '微信号（用于开通沟通）', example: 'wxid_abc123' })
  @Transform(trim)
  @IsString()
  @IsOptional()
  @MaxLength(100)
  wechat?: string;

  @ApiPropertyOptional({ description: '备注说明' })
  @Transform(trim)
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ description: '是否已关注 NailBook 公众号', example: false })
  @IsBoolean()
  @IsOptional()
  followedMp?: boolean;
}
