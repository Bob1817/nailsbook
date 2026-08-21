import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ServiceReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @IsArray()
  @IsString({ each: true })
  photos: string[];

  @IsBoolean()
  photoUseAuthorized: boolean;
}
