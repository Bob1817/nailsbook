import { IsString, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTechnicianDto {
  @ApiProperty({ description: '美甲师姓名', example: '李四' })
  @IsString()
  name: string;

  @ApiProperty({ description: '手机号码', example: '13800138000' })
  @IsPhoneNumber('CN')
  phone: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '所在城市', example: '北京' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '服务区域', example: '朝阳区' })
  @IsOptional()
  @IsString()
  serviceArea?: string;
}
