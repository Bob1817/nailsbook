import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class QuoteCustomServiceRequestDto {
  @Transform(({ value, obj }) => Number(value ?? obj.price))
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @Transform(({ value, obj }) => value ?? obj.remark)
  @IsString()
  @IsOptional()
  remark?: string;
}
