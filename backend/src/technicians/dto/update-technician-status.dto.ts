import { IsString, IsIn } from 'class-validator';

export class UpdateTechnicianStatusDto {
  @IsString()
  @IsIn(['active', 'inactive', 'suspended'])
  status: string;
}
