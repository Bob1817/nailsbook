import { Controller, Get, Patch, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { OperationLogInterceptor } from '../auth/operation-log.interceptor';

@Controller('admin/bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Permissions('booking.view')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('technicianId') technicianId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      technicianId ? parseInt(technicianId, 10) : undefined,
      customerId ? parseInt(customerId, 10) : undefined,
      status,
    );
  }

  @Get(':id')
  @Permissions('booking.view')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(parseInt(id, 10));
  }

  @Patch(':id/confirm')
  @Permissions('booking.confirm')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'booking', action: 'confirm', targetType: 'booking' })
  confirm(@Param('id') id: string) {
    return this.bookingsService.confirm(parseInt(id, 10));
  }

  @Patch(':id/complete')
  @Permissions('booking.complete')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'booking', action: 'complete', targetType: 'booking' })
  complete(@Param('id') id: string) {
    return this.bookingsService.complete(parseInt(id, 10));
  }

  @Patch(':id/cancel')
  @Permissions('booking.cancel')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'booking', action: 'cancel', targetType: 'booking' })
  cancel(@Param('id') id: string) {
    return this.bookingsService.cancel(parseInt(id, 10));
  }
}
