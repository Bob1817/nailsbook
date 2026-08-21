import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ClientOrderRecordNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
