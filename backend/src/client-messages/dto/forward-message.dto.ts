import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForwardMessageDto {
  @ApiProperty({ description: '要发送的预约ID', example: 1 })
  @Transform(({ value, obj }) =>
    (value ?? obj.order_id) ? Number(value ?? obj.order_id) : value,
  )
  @IsInt()
  @Min(1)
  orderId: number;
}
