import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import {
  SubscriptionsService,
  CreateSubscriptionPlanDto,
  UpdateTechnicianSubscriptionDto,
} from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { OperationLogInterceptor } from '../auth/operation-log.interceptor';

@Controller('technician/subscriptions')
@UseGuards(TechnicianJwtAuthGuard)
export class TechnicianSubscriptionsPublicController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: '获取订阅套餐列表' })
  @ApiResponse({ status: 200, description: '返回套餐列表' })
  findPlans() {
    return this.subscriptionsService.findPlans();
  }
}

@ApiTags('管理员-订阅')
@ApiBearerAuth()
@Controller('admin/subscription-plans')
@UseGuards(JwtAuthGuard)
export class SubscriptionPlansController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Permissions('subscription.view')
  @ApiOperation({ summary: '获取所有订阅套餐' })
  @ApiResponse({ status: 200, description: '返回套餐列表' })
  findAll() {
    return this.subscriptionsService.findPlans();
  }

  @Get(':id')
  @Permissions('subscription.view')
  @ApiOperation({ summary: '获取订阅套餐详情' })
  @ApiParam({ name: 'id', type: String, description: '套餐ID' })
  @ApiResponse({ status: 200, description: '返回套餐详情' })
  @ApiResponse({ status: 404, description: '套餐不存在' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findPlanById(parseInt(id, 10));
  }

  @Post()
  @Permissions('subscription.update')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'subscription',
    action: 'create_plan',
    targetType: 'subscription_plan',
  })
  @ApiOperation({ summary: '创建订阅套餐' })
  @ApiBody({ type: CreateSubscriptionPlanDto })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数校验失败' })
  create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch(':id')
  @Permissions('subscription.update')
  @UseInterceptors(OperationLogInterceptor)
  @OperationLog({
    module: 'subscription',
    action: 'update_plan',
    targetType: 'subscription_plan',
  })
  @ApiOperation({ summary: '更新订阅套餐' })
  @ApiParam({ name: 'id', type: String, description: '套餐ID' })
  @ApiBody({ type: CreateSubscriptionPlanDto })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '套餐不存在' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSubscriptionPlanDto>,
  ) {
    return this.subscriptionsService.updatePlan(parseInt(id, 10), dto);
  }
}

@ApiTags('管理员-美甲师订阅')
@ApiBearerAuth()
@Controller('admin/technician-subscriptions')
@UseGuards(JwtAuthGuard)
export class TechnicianSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Permissions('subscription.view')
  @ApiOperation({ summary: '获取美甲师订阅列表' })
  @ApiQuery({
    name: 'technicianId',
    type: String,
    description: '美甲师ID',
    required: false,
  })
  @ApiQuery({
    name: 'status',
    type: String,
    description: '订阅状态',
    required: false,
  })
  @ApiResponse({ status: 200, description: '返回订阅列表' })
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
  @OperationLog({
    module: 'subscription',
    action: 'update_technician_subscription',
    targetType: 'technician_subscription',
  })
  @ApiOperation({ summary: '更新美甲师订阅套餐' })
  @ApiParam({ name: 'technicianId', type: String, description: '美甲师ID' })
  @ApiBody({ type: UpdateTechnicianSubscriptionDto })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '美甲师或套餐不存在' })
  updateTechnicianSubscription(
    @Param('technicianId') technicianId: string,
    @Body() dto: UpdateTechnicianSubscriptionDto,
  ) {
    return this.subscriptionsService.updateTechnicianSubscription(
      parseInt(technicianId, 10),
      dto,
    );
  }
}
