import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCustomerFollowUpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;

  @IsDateString()
  plannedAt: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  relatedOrderId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  relatedWorkId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  beforePhotos?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  afterPhotos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nailProjects?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  materials?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tools?: string;
}
