import { IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateTechnicianProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serviceArea?: string;

  @IsOptional()
  @Matches(/^(https?:\/\/.+|\/uploads\/.+)$/i, {
    message: '头像地址格式不正确',
  })
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>;
}
