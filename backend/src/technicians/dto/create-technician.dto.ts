import { IsString, IsOptional, IsPhoneNumber } from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  name: string;

  @IsPhoneNumber('CN')
  phone: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  serviceArea?: string;
}
