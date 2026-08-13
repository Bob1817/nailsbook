import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
export class GrantConsentDto {
  @IsIn(['work_photo', 'review_publication']) contentType: string;
  @IsInt() @Min(1) contentId: number;
  @IsIn(['anonymous', 'nickname']) displayIdentity: string;
  @IsOptional() @IsString() @MaxLength(30) displayName?: string;
  @IsIn(['client_form', 'wechat_confirmation', 'written', 'legacy_migration'])
  acquisitionMethod: string;
}
