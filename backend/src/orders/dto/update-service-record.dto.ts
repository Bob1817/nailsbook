import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateServiceRecordDto {
  @IsOptional() @IsString() @MaxLength(1000) materials?: string;
  @IsOptional() @IsString() @MaxLength(1000) tools?: string;
  @IsOptional() @IsString() @MaxLength(1000) techniques?: string;
  @IsOptional() @IsString() @MaxLength(1000) nailCondition?: string;
  @IsOptional() @IsString() @MaxLength(1000) customerFeedback?: string;
  @IsOptional() @IsString() @MaxLength(1000) clientReaction?: string;
  @IsOptional() @IsString() @MaxLength(1000) discomfortNotes?: string;
  @IsOptional() @IsString() @MaxLength(1000) preferenceNotes?: string;
  @IsOptional() @IsString() @MaxLength(1000) nextServiceNotes?: string;
  @IsOptional() @IsString() @MaxLength(1000) careAdvice?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) beforePhotos?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) duringPhotos?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) afterPhotos?: string[];

  @IsOptional() @IsBoolean() complete?: boolean;

  // Only explicitly confirmed facts are copied to the long-lived customer profile.
  @IsOptional() @IsArray() profileFacts?: Array<{
    category: string;
    content: string;
  }>;
}
