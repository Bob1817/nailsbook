import { IsNotEmpty, IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class BindTechnicianDto {
  @Type(() => Number)
  @IsInt({ message: '美甲师ID必须是整数' })
  techId: number;

  @IsString()
  @IsNotEmpty({ message: '邀请码不能为空' })
  inviteCode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
