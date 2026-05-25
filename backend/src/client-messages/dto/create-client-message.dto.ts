import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientMessageDto {
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

  @ApiPropertyOptional({ description: '美甲师ID（新会话时必填）', example: 1 })
  @Transform(({ value, obj }) =>
    (value ?? obj.tech_id) ? Number(value ?? obj.tech_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  techId?: number;

  @ApiProperty({ description: '消息类型', example: 'text' })
  @Transform(({ value, obj }) => value ?? obj.message_type)
  @IsString()
  messageType: string;

  @ApiPropertyOptional({ description: '文本内容', example: '你好' })
  @Transform(({ value, obj }) => value ?? obj.content)
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '图片URL' })
  @Transform(({ value, obj }) => value ?? obj.image_url)
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: '关联类型', example: 'design' })
  @Transform(({ value, obj }) => value ?? obj.related_type)
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiPropertyOptional({ description: '关联对象ID', example: 1 })
  @Transform(({ value, obj }) =>
    (value ?? obj.related_id) ? Number(value ?? obj.related_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  relatedId?: number;
}
