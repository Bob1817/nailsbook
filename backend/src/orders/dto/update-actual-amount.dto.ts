import { IsNumber, Min } from 'class-validator';

export class UpdateActualAmountDto {
  @IsNumber() @Min(0) actualAmount: number;
}
