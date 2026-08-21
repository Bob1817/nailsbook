import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const CATEGORIES = [
  'basic_care',
  'color_style',
  'extension_reinforcement',
  'removal',
];

export class CreateServiceDto {
  @IsString() @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsString() @IsIn(CATEGORIES) category: any;
  @IsOptional() @IsString() @IsIn(['fixed', 'range']) priceType?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) priceMin?: number;
  @IsOptional() @IsNumber() @Min(0) priceMax?: number;
  @IsOptional() @IsInt() @Min(15) durationMinutes?: number;
  @IsOptional() @IsInt() @Min(7) maintenanceCycleDays?: number;
  @IsOptional() @IsBoolean() isBookable?: boolean;
}

export class UpdateServiceDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @IsIn(CATEGORIES) category?: any;
  @IsOptional() @IsString() @IsIn(['fixed', 'range']) priceType?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) priceMin?: number;
  @IsOptional() @IsNumber() @Min(0) priceMax?: number;
  @IsOptional() @IsInt() @Min(15) durationMinutes?: number;
  @IsOptional() @IsInt() @Min(7) maintenanceCycleDays?: number;
  @IsOptional() @IsBoolean() isBookable?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
