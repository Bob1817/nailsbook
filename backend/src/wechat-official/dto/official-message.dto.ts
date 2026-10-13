import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReplyOfficialMessageDto {
  @IsString()
  @MaxLength(128)
  openId!: string;

  @IsString()
  @MaxLength(600)
  content!: string;
}

export class ListOfficialMessagesQueryDto {
  /** all / pending / auto_replied / handled / note */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}
