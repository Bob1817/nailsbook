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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  SubscriptionsService,
  CreateSubscriptionPlanDto,
  UpdateTechnicianSubscriptionDto,
} from './subscriptions.service';
import { PaymentsService } from '../payments/payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TechnicianJwtAuthGuard } from '../technician-auth/technician-jwt-auth.guard';
import { TouristGuard } from '../technician-auth/tourist.guard';
import { Permissions } from '../auth/permission.decorator';
import { OperationLog } from '../auth/operation-log.decorator';
import {
  assertMiniProgramFeatureDisabled,
  isMiniProgramLaunchMode,
} from '../common/miniprogram-launch-mode';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionPaymentDto {
  @ApiProperty({ description: '套餐代码', example: 'starter' })
  @IsString()
  @IsNotEmpty()
  planCode: string;

  @ApiPropertyOptional({ description: '幂等键' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: '微信登录code，用于换取openId' })
  @IsOptional()
  @IsString()
  code?: string;
}

export class ConfirmMockSubscriptionPaymentDto {
  @ApiProperty({ description: '支付单号' })
  @IsString()
  @IsNotEmpty()
  paymentNo: string;
}

@Controller('technician/subscriptions')
@UseGuards(TechnicianJwtAuthGuard, TouristGuard)
export class TechnicianSubscriptionsPublicController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: '获取订阅套餐列表' })
  @ApiResponse({ status: 200, description: '返回套餐列表' })
  findPlans() {
    return this.subscriptionsService.findPlans(true);
  }

  @Get('current')
  @ApiOperation({ summary: '获取当前美甲师订阅、权益、用量和额度状态' })
  current(@Req() request: { user: { technicianId: number } }) {
    return this.subscriptionsService.getCurrentForTechnician(
      request.user.technicianId,
    );
  }

  @Post('pay')
  @ApiOperation({ summary: '创建订阅微信支付预下单' })
  @ApiBody({ type: CreateSubscriptionPaymentDto })
  createPayment(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: CreateSubscriptionPaymentDto,
  ) {
    return this.paymentsService.createSubscriptionPayment(
      request.user.technicianId,
      dto.planCode,
      dto.idempotencyKey,
      dto.code,
    );
  }

  @Post('confirm-mock')
  @ApiOperation({ summary: '确认模拟订阅支付（仅限非生产 mock 模式）' })
  @ApiBody({ type: ConfirmMockSubscriptionPaymentDto })
  confirmMock(
    @Req() request: { user: { technicianId: number } },
    @Body() dto: ConfirmMockSubscriptionPaymentDto,
  ) {
    return this.paymentsService.confirmMockSubscriptionPayment(
      request.user.technicianId,
      dto.paymentNo,
    );
  }

  @Get('payments/:paymentNo/status')
  @ApiOperation({ summary: '查询订阅支付单结果（待确认时主动向微信支付查单核验）' })
  paymentStatus(
    @Req() request: { user: { technicianId: number } },
    @Param('paymentNo') paymentNo: string,
  ) {
    return this.paymentsService.getSubscriptionPaymentStatus(
      request.user.technicianId,
      paymentNo,
    );
  }

  @Post('payments/:paymentNo/cancel')
  @ApiOperation({ summary: '用户取消微信支付收银台后同步关闭待支付单' })
  cancelPayment(
    @Req() request: { user: { technicianId: number } },
    @Param('paymentNo') paymentNo: string,
  ) {
    return this.paymentsService.cancelSubscriptionPayment(
      request.user.technicianId,
      paymentNo,
    );
  }

  @Get('change-preview/:planId')
  @ApiOperation({ summary: '预览套餐变更后的额度和只读影响' })
  previewChange(
    @Req() request: { user: { technicianId: number } },
    @Param('planId') planId: string,
  ) {
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

  @Get('payments')
  @Permissions('subscription:view')
  @ApiOperation({ summary: '获取订阅支付流水与实收汇总' })
  payments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('technicianId') technicianId?: string,
  ) {
    return this.subscriptionsService.findSubscriptionPayments({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      technicianId: technicianId ? parseInt(technicianId, 10) : undefined,
    });
  }

  @Get('technicians/:technicianId/detail')
  @Permissions('subscription:view')
  @ApiOperation({ summary: '获取指定美甲师当前订阅与额度实时用量' })
  technicianDetail(@Param('technicianId') technicianId: string) {
    return this.subscriptionsService.getCurrentForTechnician(
      parseInt(technicianId, 10),
    );
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
