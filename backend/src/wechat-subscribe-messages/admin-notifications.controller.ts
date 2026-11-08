import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { AdminNotificationsService } from './admin-notifications.service';

@Controller('admin/booking-notifications')
@UseGuards(JwtAuthGuard)
export class AdminNotificationsController {
  constructor(private readonly service: AdminNotificationsService) {}

  @Get()
  @Permissions('booking:view')
  list(@Query('orderId') orderId?: string, @Query('page') page?: string, @Query('status') status?: string) {
    return this.service.list(orderId, page, status);
  }

  @Get('health')
  @Permissions('booking:view')
  health() { return this.service.health(); }

  @Post(':id/retry')
  @Permissions('feature_flag:update')
  @OperationLog({ module: 'booking_notification', action: 'retry', targetType: 'notification_delivery' })
  retry(@Param('id', ParseIntPipe) id: number) { return this.service.retry(id); }
}
