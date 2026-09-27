import { IsIn, IsInt, ValidateIf, IsString, Length, Matches, Min } from 'class-validator';

export class CreateAdminUserDto {
  @Matches(/^[a-zA-Z0-9_]{3,32}$/)
  username: string;

  @IsString()
  @Length(8, 72)
  password: string;

  @IsString()
  @Length(1, 50)
  realName: string;

  @IsInt()
  @Min(1)
  roleId: number;
}

export class UpdateAdminUserDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(1, 50)
  realName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(8, 72)
  password?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  roleId?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['active', 'inactive'])
  status?: string;
}
