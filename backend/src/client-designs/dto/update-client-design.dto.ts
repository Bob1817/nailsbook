import { IsOptional, IsString } from 'class-validator';

export class UpdateClientDesignDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
