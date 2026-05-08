import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateWorkDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return JSON.stringify(value);
    return value;
  })
  @IsOptional()
  @IsString()
  images?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(',');
    return value;
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @Transform(({ value, obj }) => value ?? obj.price)
  @IsOptional()
  price?: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateWorkDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return JSON.stringify(value);
    return value;
  })
  @IsOptional()
  @IsString()
  images?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(',');
    return value;
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @Transform(({ value, obj }) => value ?? obj.price)
  @IsOptional()
  price?: number;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
