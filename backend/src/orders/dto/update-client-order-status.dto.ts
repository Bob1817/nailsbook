import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClientOrderStatusDto {
  @ApiProperty({
    description: '目标状态',
    enum: ['completed', 'cancelled'],
    example: 'completed',
  })
  @IsIn(['completed', 'cancelled'])
  status: 'completed' | 'cancelled';
}
