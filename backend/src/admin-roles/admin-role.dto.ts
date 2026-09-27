import { ArrayUnique, IsArray, IsInt, ValidateIf, IsString, Length, Matches, Min } from 'class-validator';

export class UpdateAdminRoleDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(1, 50)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(0, 200)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  permissionIds?: number[];
}

export class CreateAdminRoleDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @Matches(/^[a-zA-Z0-9_-]{2,50}$/)
  code: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(0, 200)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  permissionIds?: number[];
}
