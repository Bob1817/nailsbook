import { IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class CorrectServiceRecordAssociationDto {
  @IsIn(['customer', 'work'])
  entityType: 'customer' | 'work';

  @IsInt()
  targetId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  reason: string;
}
