import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateTechnicianBookingDto {
  @IsInt()
  @IsPositive()
  customerId: number;

  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  note?: string;
}
