import { IsIn, IsString, MaxLength } from 'class-validator';
export class CloseBookingDto {
  @IsIn(['rejected', 'no_show']) status: 'rejected' | 'no_show';
  @IsString() @MaxLength(200) reason: string;
}
