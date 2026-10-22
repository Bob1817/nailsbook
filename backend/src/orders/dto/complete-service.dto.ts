import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
export class CompleteServiceDto {
  @IsOptional() @IsDateString() actualStartTime: string;
  @IsOptional() @IsDateString() actualEndTime: string;
  @IsOptional() @IsNumber() @Min(0) actualAmount: number;
  @IsOptional() @IsNumber() @Min(0) materialCost: number;
  @IsOptional() @IsString() @MaxLength(1000) materials?: string;
  @IsOptional() @IsString() @MaxLength(1000) techniques?: string;
  @IsOptional() @IsString() @MaxLength(1000) nailCondition?: string;
  @IsOptional() @IsString() @MaxLength(1000) customerFeedback?: string;
  @IsOptional() @IsString() @MaxLength(1000) careAdvice?: string;
  @IsOptional() @IsString() @MaxLength(1000) tools?: string;
  @IsOptional() @IsString() @MaxLength(1000) clientReaction?: string;
  @IsOptional() @IsString() @MaxLength(1000) discomfortNotes?: string;
  @IsOptional() @IsString() @MaxLength(1000) preferenceNotes?: string;
  @IsOptional() @IsString() @MaxLength(1000) nextServiceNotes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) beforePhotos?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) duringPhotos?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) afterPhotos?: string[];
  @IsOptional() @IsBoolean() recordComplete?: boolean;
  @IsOptional() @IsArray() profileFacts?: Array<{ category: string; content: string }>;
}
