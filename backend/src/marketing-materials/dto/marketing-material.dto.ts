import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMarketingMaterialDto {
  @IsIn(['work_poster', 'price_list', 'booking_qr', 'social_post'])
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsObject()
  content: Record<string, unknown>;
}

export class UpdateMarketingMaterialDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class ExportMarketingMaterialDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
