import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Equals, IsBoolean, IsIn, IsString, Length, Matches } from 'class-validator';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperationLog } from '../auth/operation-log.decorator';
import { Permissions } from '../auth/permission.decorator';
import { AccountDeletionService } from './account-deletion.service';

class SubmitDeletionDto {
  @IsString() @Length(1, 500) @Matches(/\S/) reason: string;
  @Equals(true) confirmed: boolean;
}
class ReviewDeletionDto {
  @IsIn(['complete', 'reject']) action: 'complete' | 'reject';
  @IsString() @Length(1, 500) @Matches(/\S/) note: string;
  @IsBoolean() identityVerified: boolean;
}
@Controller('client/account-deletion')
@UseGuards(ClientJwtAuthGuard)
export class ClientAccountDeletionController {
  constructor(private readonly service: AccountDeletionService) {}
  @Get() status(@Req() req: any) { return this.service.own('client', req.user.clientUserId); }
  @Post() submit(@Req() req: any, @Body() dto: SubmitDeletionDto) { return this.service.submit('client', req.user.clientUserId, dto.reason); }
  @Post('cancel') cancel(@Req() req: any) { return this.service.cancel('client', req.user.clientUserId); }
}
@Controller('technician/account-deletion')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianAccountDeletionController {
  constructor(private readonly service: AccountDeletionService) {}
  @Get() status(@Req() req: any) { return this.service.own('technician', req.user.technicianId); }
  @Post() submit(@Req() req: any, @Body() dto: SubmitDeletionDto) { return this.service.submit('technician', req.user.technicianId, dto.reason); }
  @Post('cancel') cancel(@Req() req: any) { return this.service.cancel('technician', req.user.technicianId); }
}
@Controller('admin/account-deletions')
@UseGuards(JwtAuthGuard)
export class AdminAccountDeletionController {
  constructor(private readonly service: AccountDeletionService) {}
  @Get() @Permissions('account-deletion:view') list(@Query('page') page?: string) { return this.service.list(Number.isSafeInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1); }
  @Get(':id') @Permissions('account-deletion:view') detail(@Param('id', ParseIntPipe) id: number) { return this.service.detail(id); }
  @Post(':id/review') @Permissions('account-deletion:manage') @OperationLog({ module: 'account-deletion', action: 'review', targetType: 'account-deletion-request', logResponse: false }) review(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() dto: ReviewDeletionDto) { return this.service.review(id, req.user.userId, dto.action, dto.note, dto.identityVerified); }
}
