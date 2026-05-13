import { IsIn } from 'class-validator';

export class UpdateClientOrderStatusDto {
  @IsIn(['completed', 'cancelled'])
  status: 'completed' | 'cancelled';
}
