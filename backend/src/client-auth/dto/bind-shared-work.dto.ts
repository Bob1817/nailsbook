import { Equals, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BindSharedWorkDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workId: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{48}$/)
  shareToken?: string;

  @Equals(true, { message: '请先确认绑定这位美甲师' })
  confirmed: boolean;
}
