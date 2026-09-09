import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveWorkPromotionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(100000000)
  discountAmountFen: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
