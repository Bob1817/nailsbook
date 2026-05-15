import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsInt()
  conversationId?: number;

  @IsOptional()
  @IsInt()
  techId?: number;

  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsString()
  @IsIn(['text', 'image', 'system', 'quote', 'booking', 'social_media'])
  messageType: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsInt()
  relatedId?: number;
}
