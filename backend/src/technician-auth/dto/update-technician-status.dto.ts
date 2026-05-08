import { IsIn, IsString } from 'class-validator';

export class UpdateTechnicianSelfStatusDto {
  @IsString()
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
