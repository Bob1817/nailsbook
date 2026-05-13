import { IsInt, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateTechnicianOrderDto {
  @IsInt()
  customerId: number;

  @IsString()
  serviceName: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
