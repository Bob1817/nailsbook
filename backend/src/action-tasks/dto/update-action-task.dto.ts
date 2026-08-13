import { IsDateString, IsIn, IsOptional } from 'class-validator';
export class UpdateActionTaskDto {
  @IsIn(['completed', 'ignored', 'snoozed']) status: string;
  @IsOptional() @IsDateString() remindAt?: string;
}
