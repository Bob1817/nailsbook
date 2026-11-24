import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CustomerServiceMessageDto {
  @IsNotEmpty({ message: '请填写咨询内容' })
  @IsString()
  @MaxLength(500, { message: '咨询内容不得超过500字' })
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: '联系电话格式不正确' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '联系人姓名过长' })
  name?: string;

  @IsNotEmpty({ message: '咨询来源不能为空' })
  @IsString()
  source: string; // 'about_page' | 'client_profile' | 'technician_profile' | 'technician_help' | 'client_help'

  @IsOptional()
  @IsString()
  role?: string; // 'guest' | 'client' | 'technician'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}
