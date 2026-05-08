import { IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class RequestTechnicianCodeDto {
  @IsNotEmpty()
  @IsPhoneNumber('CN')
  phone: string;
}
