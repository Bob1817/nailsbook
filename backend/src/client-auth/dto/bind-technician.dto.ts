import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsIn,
  Matches,
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
  @Matches(/^[A-Za-z0-9]{8}$/, { message: '邀请码必须为8位字母或数字' })
  inviteCode: string;

  @ApiPropertyOptional({ description: '是否设为默认美甲师', example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '申请绑定备注', example: '我是老顾客小红' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: '绑定来源', enum: ['manual', 'card'] })
  @IsOptional()
  @IsIn(['manual', 'card'])
  source?: 'manual' | 'card';
}
