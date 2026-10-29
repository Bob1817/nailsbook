import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTechnicianSelfStatusDto {
  @IsOptional() @IsBoolean() homeService?: boolean;
  @IsOptional() @IsBoolean() shopService?: boolean;
  @ApiProperty({
    description: '状态',
    example: 'active',
    enum: ['active', 'inactive'],
  })
  @IsString()
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
