import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const IMAGE_URL = /^(https?:\/\/.+|\/uploads\/.+)$/i;

export class BrandEnvironmentPhotoDto {
  @IsString()
  @Matches(IMAGE_URL, { message: '环境照片地址格式不正确' })
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BrandFaqDto {
  @IsString()
  @MaxLength(100)
  question: string;

  @IsString()
  @MaxLength(500)
  answer: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBrandProfileDto {
  @IsString()
  @MaxLength(50)
  brandName: string;

  @IsOptional() @IsString() @MaxLength(80) tagline?: string;
  @IsOptional() @IsString() @MaxLength(50) city?: string;
  @IsOptional() @IsString() @MaxLength(120) publicServiceArea?: string;
  @IsOptional() @IsString() @MaxLength(1000) artistIntroduction?: string;
  @IsOptional() @IsString() @MaxLength(1000) aestheticPhilosophy?: string;
  @IsOptional() @IsString() @MaxLength(500) transportationNotes?: string;
  @IsOptional() @IsString() @MaxLength(1000) hygieneStandards?: string;
  @IsOptional() @IsString() @MaxLength(1000) materialStandards?: string;
  @IsOptional() @IsString() @MaxLength(1000) allergyNotice?: string;
  @IsOptional() @IsString() @MaxLength(500) latePolicy?: string;
  @IsOptional() @IsString() @MaxLength(500) cancellationPolicy?: string;
  @IsOptional() @IsString() @MaxLength(1000) aftercarePolicy?: string;
  @IsOptional() @IsString() @MaxLength(100) shareTitle?: string;
  @IsOptional() @IsString() @MaxLength(200) shareDescription?: string;

  @IsOptional()
  @Matches(IMAGE_URL, { message: '分享封面地址格式不正确' })
  shareCoverUrl?: string;

  @IsString()
  @IsIn(['draft', 'published'])
  publicationStatus: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrandEnvironmentPhotoDto)
  environmentPhotos?: BrandEnvironmentPhotoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrandFaqDto)
  faqs?: BrandFaqDto[];
}
