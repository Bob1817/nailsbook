import { Controller, Get, Patch, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { OperationLogInterceptor } from '../auth/operation-log.interceptor';

@Controller('admin/quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @Permissions('quote.view')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('technicianId') technicianId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ) {
    return this.quotesService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      technicianId ? parseInt(technicianId, 10) : undefined,
      customerId ? parseInt(customerId, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  @Permissions('quote.view')
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(parseInt(id, 10));
  }

  @Patch(':id/cancel')
  @Permissions('quote.cancel')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'quote', action: 'cancel', targetType: 'quote' })
  cancel(@Param('id') id: string) {
    return this.quotesService.cancel(parseInt(id, 10));
  }
}
