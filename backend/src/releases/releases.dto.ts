import { IsBoolean, IsISO8601, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
export class SaveReleaseDto {
  @Matches(/^\d{1,4}\.\d{1,4}\.\d{1,4}$/) version: string;
  @IsIn(['all', 'client', 'technician']) audience: string;
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(80) title: string;
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(4000) content: string;
  @IsOptional() @IsBoolean() important?: boolean;
  @IsOptional() @IsBoolean() published?: boolean;
  @IsOptional() @IsISO8601({ strict:true }) @Matches(/(?:Z|[+-]\d{2}:\d{2})$/) scheduledFor?: string;
}
export class ReleaseQueryDto {
  @IsIn(['client', 'technician']) role: string;
  @IsOptional() @Matches(/^\d{1,4}\.\d{1,4}\.\d{1,4}$/) version?: string;
}
