import { IsIn } from 'class-validator';

export class UpdateClientBookingStatusDto {
  @IsIn(['completed', 'cancelled'])
  status: 'completed' | 'cancelled';
}
