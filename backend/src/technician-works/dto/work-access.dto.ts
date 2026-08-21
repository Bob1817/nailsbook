import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';

export class WorkClientGrantDto {
  @Type(() => Number)
  @IsInt()
  customerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderId?: number;

  @IsBoolean()
  canView: boolean;

  @IsBoolean()
  canShare: boolean;

  @IsBoolean()
  canFavorite: boolean;

  @IsBoolean()
  canLike: boolean;

  @IsBoolean()
  canComment: boolean;
}

export class UpdateWorkAccessDto {
  @IsIn(['public', 'authorized_clients'])
  visibilityScope: 'public' | 'authorized_clients';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkClientGrantDto)
  grants: WorkClientGrantDto[];
}
