import { IsString, IsInt } from 'class-validator';

export class UpdateClientOrderDto {
  @IsInt()
  addressId: number;

  @IsString()
  serviceDate: string;

  @IsString()
  startTime: string;
}
