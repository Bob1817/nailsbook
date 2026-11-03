import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { WorkSyncService } from './work-sync.service';

class ParseWorkDto {
  @IsString() @MaxLength(4000) link: string;
  @IsIn(['note', 'structured', 'summary']) strategy: string;
}
class ImportMediaDto {
  @IsString() @MaxLength(4000) url: string;
}
@Controller('technician/work-sync')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class WorkSyncController {
  constructor(private readonly service: WorkSyncService) {}
  @Post('parse')
  parse(@Body() dto: ParseWorkDto) { return this.service.parse(dto.link, dto.strategy); }
  @Post('media')
  media(@Req() req: { user: { technicianId: number } }, @Body() dto: ImportMediaDto) {
    return this.service.media(req.user.technicianId, dto.url);
  }
}
