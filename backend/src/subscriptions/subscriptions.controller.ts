import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { SubscriptionsService, CreateSubscriptionPlanDto, UpdateTechnicianSubscriptionDto } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { OperationLogInterceptor } from '../auth/operation-log.interceptor';

@Controller('admin/subscription-plans')
@UseGuards(JwtAuthGuard)
export class SubscriptionPlansController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Permissions('subscription.view')
  findAll() {
    return this.subscriptionsService.findPlans();
  }

  @Get(':id')
  @Permissions('subscription.view')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findPlanById(parseInt(id, 10));
  }

  @Post()
  @Permissions('subscription.update')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'subscription', action: 'create_plan', targetType: 'subscription_plan' })
  create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch(':id')
  @Permissions('subscription.update')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'subscription', action: 'update_plan', targetType: 'subscription_plan' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateSubscriptionPlanDto>) {
    return this.subscriptionsService.updatePlan(parseInt(id, 10), dto);
  }
}

@Controller('admin/technician-subscriptions')
@UseGuards(JwtAuthGuard)
export class TechnicianSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Permissions('subscription.view')
  findAll(
    @Query('technicianId') technicianId?: string,
    @Query('status') status?: string,
  ) {
    return this.subscriptionsService.findTechnicianSubscriptions(
      technicianId ? parseInt(technicianId, 10) : undefined,
      status,
    );
  }

  @Patch('technicians/:technicianId')
  @Permissions('subscription.update')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({ module: 'subscription', action: 'update_technician_subscription', targetType: 'technician_subscription' })
  updateTechnicianSubscription(
    @Param('technicianId') technicianId: string,
    @Body() dto: UpdateTechnicianSubscriptionDto,
  ) {
    return this.subscriptionsService.updateTechnicianSubscription(parseInt(technicianId, 10), dto);
  }
}
