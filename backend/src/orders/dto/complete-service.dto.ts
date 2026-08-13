import {
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
}
