import { IsNotEmpty, IsOptional, IsString, MaxLength, IsDateString, IsBoolean } from 'class-validator';

export class CreateNoticeDto {
  @IsNotEmpty({ message: '通知标题不能为空' })
  @IsString()
  @MaxLength(30, { message: '通知标题最多30个字符' })
  title: string;

  @IsNotEmpty({ message: '通知内容不能为空' })
  @IsString()
  @MaxLength(1000, { message: '通知正文最多1000个字符' })
  content: string;

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsDateString({}, { message: '定时时间格式不正确' })
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

export class UpdateNoticeDto {
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: '通知标题最多30个字符' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: '通知正文最多1000个字符' })
  content?: string;

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsDateString({}, { message: '定时时间格式不正确' })
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
