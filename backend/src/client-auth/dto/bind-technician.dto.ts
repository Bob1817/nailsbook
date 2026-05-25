import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BindTechnicianDto {
  @ApiProperty({ description: '美甲师ID', example: 1 })
  @Type(() => Number)
  @IsInt({ message: '美甲师ID必须是整数' })
  techId: number;

  @ApiProperty({ description: '邀请码', example: 'ABC123' })
  @IsString()
  @IsNotEmpty({ message: '邀请码不能为空' })
  inviteCode: string;

  @ApiPropertyOptional({ description: '是否设为默认美甲师', example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
