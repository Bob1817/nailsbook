import { Equals, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class BindQuickBookingDto {
  @IsInt()
  @Min(1)
  techId: number;

  @IsString()
  @IsNotEmpty()
  inviteCode: string;

  @Equals(true)
  confirmed: boolean;
}
