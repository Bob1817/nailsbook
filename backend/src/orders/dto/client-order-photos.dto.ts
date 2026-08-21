import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class ClientOrderPhotosDto {
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  photos: string[];
}
