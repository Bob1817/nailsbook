import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTechnicianMessageDto {
  @ApiPropertyOptional({ description: '会话ID', example: 1 })
  @Transform(({ value, obj }) =>
    (value ?? obj.conversation_id)
      ? Number(value ?? obj.conversation_id)
      : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  conversationId?: number;

  @ApiPropertyOptional({ description: '客户ID', example: 1 })
  @Transform(({ value, obj }) =>
    (value ?? obj.client_id) ? Number(value ?? obj.client_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number;

  @ApiProperty({ description: '消息类型', example: 'text' })
  @Transform(({ value, obj }) => value ?? obj.message_type)
  @IsString()
  messageType: string;

  @ApiPropertyOptional({ description: '消息内容', example: '你好' })
  @Transform(({ value, obj }) => value ?? obj.content)
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '图片URL' })
  @Transform(({ value, obj }) => value ?? obj.image_url)
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '关联类型', example: 'work' })
  @Transform(({ value, obj }) => value ?? obj.related_type)
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiPropertyOptional({ description: '关联ID', example: 1 })
  @Transform(({ value, obj }) =>
    (value ?? obj.related_id) ? Number(value ?? obj.related_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  relatedId?: number;
}
