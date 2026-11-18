import { IsNotEmpty, IsOptional, IsString, MaxLength, IsDateString, IsBoolean } from 'class-validator';

export class CreateActivityDto {
  @IsNotEmpty({ message: '活动标题不能为空' })
  @IsString()
  @MaxLength(40, { message: '活动标题最多40个字符' })
  title: string;

  @IsNotEmpty({ message: '活动封面主图不能为空' })
  @IsString()
  coverUrl: string;

  @IsOptional()
  @IsBoolean()
  recommendToHero?: boolean;

  @IsOptional()
  @IsString()
  contentBlocks?: string; // JSON string of blocks

  @IsOptional()
  @IsDateString({}, { message: '活动开始时间格式不正确' })
  startTime?: string;

  @IsOptional()
  @IsDateString({}, { message: '活动结束时间格式不正确' })
  endTime?: string;

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

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @MaxLength(40, { message: '活动标题最多40个字符' })
  title?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsBoolean()
  recommendToHero?: boolean;

  @IsOptional()
  @IsString()
  contentBlocks?: string;

  @IsOptional()
  @IsDateString({}, { message: '活动开始时间格式不正确' })
  startTime?: string;

  @IsOptional()
  @IsDateString({}, { message: '活动结束时间格式不正确' })
  endTime?: string;

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

export class SetHeroRecommendationDto {
  @IsNotEmpty()
  @IsBoolean()
  recommendToHero: boolean;
}
