import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateClientBookingDto {
  @Transform(({ value, obj }) => value ?? obj.service_date)
  @IsString()
  @IsNotEmpty()
  serviceDate: string;

  @Transform(({ value, obj }) => value ?? obj.start_time)
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @Transform(({ value, obj }) => Number(value ?? obj.address_id))
  @IsInt()
  @Min(1)
  addressId: number;
}
