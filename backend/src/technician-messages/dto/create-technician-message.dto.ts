import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTechnicianMessageDto {
  @Transform(({ value, obj }) =>
    value ?? obj.conversation_id ? Number(value ?? obj.conversation_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  conversationId?: number;

  @Transform(({ value, obj }) =>
    value ?? obj.client_id ? Number(value ?? obj.client_id) : value,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number;

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
