import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTechnicianSelfStatusDto {
  @ApiProperty({
    description: '状态',
    example: 'active',
    enum: ['active', 'inactive'],
  })
  @IsString()
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
