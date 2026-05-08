import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateClientMessageDto {
  @Transform(({ value, obj }) =>
    value ?? obj.conversation_id ? Number(value ?? obj.conversation_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  conversationId?: number;

  @Transform(({ value, obj }) =>
    value ?? obj.tech_id ? Number(value ?? obj.tech_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  techId?: number;

  @Transform(({ value, obj }) => value ?? obj.message_type)
  @IsString()
  messageType: string;

  @Transform(({ value, obj }) => value ?? obj.content)
  @IsOptional()
  @IsString()
  content?: string;

  @Transform(({ value, obj }) => value ?? obj.image_url)
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Transform(({ value, obj }) => value ?? obj.related_type)
  @IsOptional()
  @IsString()
  relatedType?: string;

  @Transform(({ value, obj }) =>
    value ?? obj.related_id ? Number(value ?? obj.related_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  relatedId?: number;
}
