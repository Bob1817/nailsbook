import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SelectRoleDto {
  @ApiProperty({
    description: '选择的角色',
    enum: ['client', 'technician'],
  })
  @IsIn(['client', 'technician'])
  role: 'client' | 'technician';

  @ApiPropertyOptional({ description: '选择客户时必填的美甲师邀请码' })
  @ValidateIf((dto: SelectRoleDto) => dto.role === 'client')
  @IsNotEmpty({ message: '客户注册必须填写美甲师邀请码' })
  @IsString()
  inviteCode?: string;

  @ApiPropertyOptional({ description: '选择美甲师时必填的系统激活密钥' })
  @ValidateIf((dto: SelectRoleDto) => dto.role === 'technician')
  @IsNotEmpty({ message: '美甲师注册必须填写系统激活密钥' })
  @IsString()
  activationKey?: string;
}
