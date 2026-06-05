import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientJwtAuthGuard } from '../client-auth/client-jwt-auth.guard';
import { ClientReportsService } from './client-reports.service';

@ApiTags('客户端-举报')
@ApiBearerAuth()
@Controller('client/reports')
@UseGuards(ClientJwtAuthGuard)
export class ClientReportsController {
  constructor(private readonly service: ClientReportsService) {}

  @Post()
  @ApiOperation({ summary: '举报评论' })
  createReport(
    @Req() req: { user: { clientUserId: number } },
    @Body() body: { commentId: number; reason: string },
  ) {
    return this.service.createReport({
      commentId: body.commentId,
      reporterId: req.user.clientUserId,
      reporterType: 'client',
      reason: body.reason,
    });
  }
}
