import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { ClientDesignsService } from './client-designs.service';

@Controller('technician/designs')
@UseGuards(TechnicianJwtAuthGuard)
@ApiTags('美甲师-私人设计')
@ApiBearerAuth()
export class TechnicianDesignsController {
  constructor(private readonly designsService: ClientDesignsService) {}

  @Get()
  @ApiOperation({ summary: '获取客户私人设计需求' })
  list(@Req() request: { user: { technicianId: number } }) {
    return this.designsService.findForTechnician(request.user.technicianId);
  }

  @Post(':id/quote')
  @ApiOperation({ summary: '为私人设计报价' })
  quote(
    @Req() request: { user: { technicianId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { price: number; remark?: string },
  ) {
    return this.designsService.quoteForTechnician(
      request.user.technicianId,
      id,
      Number(body.price),
      body.remark,
    );
  }
}
