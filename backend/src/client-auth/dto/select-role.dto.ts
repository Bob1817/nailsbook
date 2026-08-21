import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SelectRoleDto {
  @ApiProperty({
    description: '选择的角色',
    enum: ['client', 'technician'],
  })
  @IsIn(['client', 'technician'])
  role: 'client' | 'technician';

  @ApiPropertyOptional({ description: '选择客户时，可选填美甲师邀请码进行绑定' })
  @IsOptional()
  @IsString()
  inviteCode?: string;

  @ApiPropertyOptional({ description: '选择美甲师时，可选填激活密钥完成认证' })
  @IsOptional()
  @IsString()
  activationKey?: string;
}
