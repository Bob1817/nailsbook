import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTechnicianStatusDto {
  @ApiProperty({
    description: '状态',
    enum: ['active', 'inactive', 'suspended'],
    example: 'active',
  })
  @IsString()
  @IsIn(['active', 'inactive', 'suspended'])
  status: string;
}
