import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateTechnicianDto {
  @ApiProperty({ description: '美甲师激活密钥（超管后台生成）', example: 'A1B2C3D4E5F6G7H8' })
  @IsString()
  @IsNotEmpty({ message: '激活密钥不能为空' })
  activationKey: string;
}
