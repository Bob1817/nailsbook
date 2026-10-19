import { IsIn } from 'class-validator';

export class DeclineBookingQuoteDto {
  @IsIn([
    '太贵了',
    '距离太远了',
    '最近没空',
    '只是问问而已',
    '款式还没决定',
    '其他原因',
  ])
  reason: string;
}
