import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmQrLoginDto {
  @ApiProperty({ description: '扫码会话令牌' })
  @IsString()
  @IsNotEmpty()
  sceneToken: string;

  @ApiProperty({
    description: '操作类型：scan(已扫码) | confirm(确认登录) | cancel(取消)',
    enum: ['scan', 'confirm', 'cancel'],
  })
  @IsIn(['scan', 'confirm', 'cancel'])
  action: 'scan' | 'confirm' | 'cancel';
}
