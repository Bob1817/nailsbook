import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
  @IsOptional() @IsBoolean() refundDeposit?: boolean;
}
