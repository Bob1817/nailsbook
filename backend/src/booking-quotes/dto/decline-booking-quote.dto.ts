import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeclineBookingQuoteDto {
  // 既支持常见原因选项，也支持客户自行填写的理由
  @IsString()
  @IsNotEmpty({ message: '请填写不预约的原因' })
  @MaxLength(120, { message: '原因最多 120 个字' })
  reason: string;
}
