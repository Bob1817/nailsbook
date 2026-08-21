import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
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
import { TouristGuard } from '../technician-auth/tourist.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import { OperationLogInterceptor } from '../auth/operation-log.interceptor';
import {
  assertMiniProgramFeatureDisabled,
  isMiniProgramLaunchMode,
} from '../common/miniprogram-launch-mode';

@Controller('technician/subscriptions')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianSubscriptionsPublicController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: '获取订阅套餐列表' })
  @ApiResponse({ status: 200, description: '返回套餐列表' })
  findPlans() {
    if (isMiniProgramLaunchMode()) {
      assertMiniProgramFeatureDisabled('订阅套餐');
    }
    return this.subscriptionsService.findPlans(true);
  }

  @Get('current')
  @ApiOperation({ summary: '获取当前美甲师订阅、权益、用量和额度状态' })
  current(@Req() request: { user: { technicianId: number } }) {
    return this.subscriptionsService.getCurrentForTechnician(
      request.user.technicianId,
    );
  }

  @Get('change-preview/:planId')
  @ApiOperation({ summary: '预览套餐变更后的额度和只读影响' })
  previewChange(
    @Req() request: { user: { technicianId: number } },
    @Param('planId') planId: string,
  ) {
    if (isMiniProgramLaunchMode()) {
      assertMiniProgramFeatureDisabled('订阅变更');
    }
    return this.subscriptionsService.previewPlanChange(
      request.user.technicianId,
      parseInt(planId, 10),
    );
  }

  @Get('changes')
  @ApiOperation({ summary: '获取当前美甲师套餐变更记录' })
  changes(@Req() request: { user: { technicianId: number } }) {
    return this.subscriptionsService.findSubscriptionChanges(
      request.user.technicianId,
    );
  }
}

@ApiTags('管理员-订阅')
@ApiBearerAuth()
@Controller('admin/subscription-plans')
@UseGuards(JwtAuthGuard)
export class SubscriptionPlansController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Permissions('subscription:view')
  @ApiOperation({ summary: '获取所有订阅套餐' })
  @ApiResponse({ status: 200, description: '返回套餐列表' })
  findAll() {
    return this.subscriptionsService.findPlans();
  }

  @Get(':id')
  @Permissions('subscription:view')
  @ApiOperation({ summary: '获取订阅套餐详情' })
  @ApiParam({ name: 'id', type: String, description: '套餐ID' })
  @ApiResponse({ status: 200, description: '返回套餐详情' })
  @ApiResponse({ status: 404, description: '套餐不存在' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findPlanById(parseInt(id, 10));
  }

  @Post()
  @Permissions('subscription:update')
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
  @Permissions('subscription:update')
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
  @Permissions('subscription:view')
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

  @Get('metrics/overview')
  @Permissions('subscription:view')
  @ApiOperation({ summary: '获取订阅升级触发和套餐变更指标' })
  metrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.subscriptionsService.getSubscriptionMetrics(startDate, endDate);
  }

  @Get('technicians/:technicianId/changes')
  @Permissions('subscription:view')
  @ApiOperation({ summary: '获取美甲师套餐变更审计记录' })
  changes(@Param('technicianId') technicianId: string) {
    return this.subscriptionsService.findSubscriptionChanges(
      parseInt(technicianId, 10),
    );
  }

  @Patch('technicians/:technicianId')
  @Permissions('subscription:update')
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
