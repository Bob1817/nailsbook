import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class ReviewOrderDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  shopName?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
