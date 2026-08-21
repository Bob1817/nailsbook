import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCustomerFollowUpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;

  @IsDateString()
  plannedAt: string;
}
