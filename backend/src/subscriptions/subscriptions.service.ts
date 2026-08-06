import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ description: '套餐名称', example: '基础版' })
  name: string;

  @ApiProperty({ description: '套餐代码', example: 'basic' })
  code: string;

  @ApiProperty({ description: '价格', example: 99 })
  price: number;

  @ApiProperty({ description: '计费周期', example: 'monthly' })
  billingCycle: string;

  @ApiPropertyOptional({ description: '最大客户数', example: 50 })
  maxCustomers?: number;

  @ApiPropertyOptional({ description: '每月最大预约数', example: 100 })
  maxMonthlyBookings?: number;

  @ApiPropertyOptional({ description: '最大作品数', example: 300 })
  maxWorks?: number;

  @ApiPropertyOptional({ description: '最大存储字节数', example: 5368709120 })
  maxStorageBytes?: number;

  @ApiPropertyOptional({ description: '每月最大宣传导出次数', example: 30 })
  maxMarketingExports?: number;

  @ApiPropertyOptional({ description: '每月赠送短信数', example: 30 })
  maxMonthlySms?: number;

  @ApiPropertyOptional({ description: '最大员工数', example: 1 })
  maxEmployees?: number;

  @ApiPropertyOptional({ description: '最大预约页面数', example: 1 })
  maxBookingPages?: number;

  @ApiPropertyOptional({ description: '适用经营阶段' })
  targetStage?: string;

  @ApiPropertyOptional({ description: '套餐说明' })
  description?: string;

  @ApiPropertyOptional({
    description: '功能列表',
    example: ['基础预约', '客户管理'],
  })
  features?: string[];

  @ApiPropertyOptional({ description: '状态', example: 'active' })
  status?: string;
}

export class UpdateTechnicianSubscriptionDto {
  @ApiProperty({ description: '套餐ID', example: 1 })
  planId: number;

  @ApiPropertyOptional({ description: '降级是否在当前周期结束后生效' })
  applyAtPeriodEnd?: boolean;
}

type MeteredResource = 'marketingExports' | 'monthlySms';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findPlans(activeOnly = false) {
    await this.ensureDefaultPlans();
    return this.prisma.subscriptionPlan.findMany({
      where: activeOnly ? { status: 'active' } : undefined,
      orderBy: { price: 'asc' },
    });
  }

  async getCurrentForTechnician(technicianId: number) {
    const freePlan = await this.ensureFreePlan();
    let subscription = await this.prisma.technicianSubscription.findUnique({
      where: { technicianId },
      include: { plan: true },
    });
    const now = new Date();
    if (
      subscription?.pendingPlanCode &&
      subscription.changeEffectiveAt &&
      subscription.changeEffectiveAt <= now
    ) {
      subscription = await this.applyScheduledPlanChange(subscription, now);
    }
    const expired = Boolean(
      subscription?.expiredAt && subscription.expiredAt < now,
    );
    if (!subscription || expired || subscription.status !== 'active') {
      const previousPlanCode = subscription?.plan?.code ?? null;
      subscription = await this.prisma.technicianSubscription.upsert({
        where: { technicianId },
        create: {
          technicianId,
          planId: freePlan.id,
          status: 'active',
          startedAt: now,
          expiredAt: null,
        },
        update: {
          planId: freePlan.id,
          status: 'active',
          startedAt: now,
          expiredAt: null,
          cancelledAt: expired ? now : subscription?.cancelledAt,
        },
        include: { plan: true },
      });
      await this.prisma.subscriptionChange.create({
        data: {
          technicianId,
          fromPlanCode: previousPlanCode,
          toPlanCode: freePlan.code,
          reason: expired ? 'expired' : 'fallback_to_free',
          effectiveAt: now,
        },
      });
    }
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const activeSince = this.activeSince(now);
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [
      customerCount,
      monthlyBookings,
      worksCount,
      resourceUsage,
      storageUsage,
    ] = await Promise.all([
      this.prisma.customer.count({
        where: {
          technicianId,
          archivedAt: null,
          OR: this.activeCustomerConditions(activeSince),
        },
      }),
      this.prisma.order.count({
        where: {
          technicianId,
          createdAt: {
            gte: periodStart,
          },
          status: {
            in: ['pending_quote', 'pending_confirm', 'confirmed', 'completed'],
          },
        },
      }),
      this.prisma.nailWork.count({ where: { techId: technicianId } }),
      this.prisma.subscriptionResourceUsage.findUnique({
        where: { technicianId_period: { technicianId, period } },
      }),
      this.prisma.subscriptionResourceUsage.findUnique({
        where: {
          technicianId_period: { technicianId, period: 'lifetime' },
        },
      }),
    ]);
    const features = this.parseFeatures(subscription.plan.features);
    return {
      id: subscription.id,
      status: subscription.status,
      startedAt: subscription.startedAt,
      expiredAt: subscription.expiredAt,
      pendingChange:
        subscription.pendingPlanCode && subscription.changeEffectiveAt
          ? {
              planCode: subscription.pendingPlanCode,
              effectiveAt: subscription.changeEffectiveAt,
            }
          : null,
      plan: {
        id: subscription.plan.id,
        code: subscription.plan.code,
        name: subscription.plan.name,
        price: subscription.plan.price,
        billingCycle: subscription.plan.billingCycle,
        features,
        maxCustomers: subscription.plan.maxCustomers,
        maxMonthlyBookings: subscription.plan.maxMonthlyBookings,
        maxWorks: subscription.plan.maxWorks,
        maxStorageBytes: subscription.plan.maxStorageBytes,
        maxMarketingExports: subscription.plan.maxMarketingExports,
        maxMonthlySms: subscription.plan.maxMonthlySms,
        maxEmployees: subscription.plan.maxEmployees,
        maxBookingPages: subscription.plan.maxBookingPages,
        targetStage: subscription.plan.targetStage,
        description: subscription.plan.description,
      },
      usage: {
        customerCount,
        monthlyBookings,
        worksCount,
        storageBytes: storageUsage?.storageBytes ?? 0,
        marketingExports: resourceUsage?.marketingExports ?? 0,
        monthlySms: resourceUsage?.smsSent ?? 0,
      },
      entitlements: {
        customers: this.toEntitlement(
          customerCount,
          subscription.plan.maxCustomers,
        ),
        monthlyBookings: this.toEntitlement(
          monthlyBookings,
          subscription.plan.maxMonthlyBookings,
        ),
        works: this.toEntitlement(worksCount, subscription.plan.maxWorks),
        storage: this.toEntitlement(
          storageUsage?.storageBytes ?? 0,
          subscription.plan.maxStorageBytes,
        ),
        marketingExports: this.toEntitlement(
          resourceUsage?.marketingExports ?? 0,
          subscription.plan.maxMarketingExports,
        ),
        monthlySms: this.toEntitlement(
          resourceUsage?.smsSent ?? 0,
          subscription.plan.maxMonthlySms,
        ),
        employees: this.toEntitlement(1, subscription.plan.maxEmployees),
        bookingPages: this.toEntitlement(1, subscription.plan.maxBookingPages),
      },
      limits: {
        customersReached:
          subscription.plan.maxCustomers != null &&
          customerCount >= subscription.plan.maxCustomers,
        monthlyBookingsReached:
          subscription.plan.maxMonthlyBookings != null &&
          monthlyBookings >= subscription.plan.maxMonthlyBookings,
      },
      paymentReady: false,
      upgradeMode: 'contact_admin',
    };
  }

  async assertFeature(technicianId: number, feature: string) {
    const current = await this.getCurrentForTechnician(technicianId);
    if (!current.plan.features.includes(feature)) {
      await this.recordUpgradeTrigger(
        technicianId,
        `feature_${feature}`,
        current.plan?.code,
      );
      throw new ForbiddenException('当前套餐不包含此功能');
    }
    return current;
  }

  async assertAnyFeature(technicianId: number, features: string[]) {
    const current = await this.getCurrentForTechnician(technicianId);
    if (!features.some((feature) => current.plan.features.includes(feature))) {
      await this.recordUpgradeTrigger(
        technicianId,
        `feature_${features.join('_or_')}`,
        current.plan?.code,
      );
      throw new ForbiddenException('当前套餐不包含此功能');
    }
    return current;
  }

  async assertCanCreateBooking(technicianId: number) {
    const current = await this.getCurrentForTechnician(technicianId);
    if (current.limits.monthlyBookingsReached) {
      await this.recordUpgradeTrigger(
        technicianId,
        'booking_quota_reached',
        current.plan?.code,
      );
      throw new ForbiddenException('当前套餐本月预约额度已用完，请升级套餐');
    }
    return current;
  }

  async assertCanCreateWork(technicianId: number) {
    const current = await this.getCurrentForTechnician(technicianId);
    if (current.entitlements.works.reached) {
      await this.recordUpgradeTrigger(
        technicianId,
        'works_quota_reached',
        current.plan?.code,
      );
      throw new ForbiddenException('当前套餐作品额度已用完，请升级套餐');
    }
    return current;
  }

  async assertCanActivateCustomer(technicianId: number, clientUserId: number) {
    const activeCustomer = await this.prisma.customer.findFirst({
      where: {
        technicianId,
        clientUserId,
        archivedAt: null,
        OR: this.activeCustomerConditions(this.activeSince(new Date())),
      },
      select: { id: true },
    });
    if (activeCustomer) return;

    const current = await this.getCurrentForTechnician(technicianId);
    if (current.entitlements.customers.reached) {
      await this.recordUpgradeTrigger(
        technicianId,
        'customer_quota_reached',
        current.plan?.code,
      );
      throw new ForbiddenException('当前套餐活跃客户额度已用完，请升级套餐');
    }
  }

  async assertCanUseStorage(technicianId: number, bytes: number) {
    const current = await this.getCurrentForTechnician(technicianId);
    const storage = current.entitlements.storage;
    if (storage.limit != null && storage.used + bytes > storage.limit) {
      await this.recordUpgradeTrigger(
        technicianId,
        'storage_quota_reached',
        current.plan?.code,
        { requestedBytes: bytes },
      );
      throw new ForbiddenException(
        '当前套餐存储空间不足，请清理素材或升级套餐',
      );
    }
  }

  async recordStorageUsage(technicianId: number, bytes: number) {
    if (bytes <= 0) return;
    const period = 'lifetime';
    await this.prisma.subscriptionResourceUsage.upsert({
      where: { technicianId_period: { technicianId, period } },
      create: { technicianId, period, storageBytes: bytes },
      update: { storageBytes: { increment: bytes } },
    });
  }

  async releaseStorageUsage(technicianId: number, bytes: number) {
    if (bytes <= 0) return;
    const period = 'lifetime';
    const usage = await this.prisma.subscriptionResourceUsage.findUnique({
      where: { technicianId_period: { technicianId, period } },
    });
    if (!usage) return;
    await this.prisma.subscriptionResourceUsage.update({
      where: { technicianId_period: { technicianId, period } },
      data: { storageBytes: Math.max(0, usage.storageBytes - bytes) },
    });
  }

  async consumeMonthlyResource(
    technicianId: number,
    resource: MeteredResource,
    idempotencyKey: string,
    amount = 1,
    metadata?: Record<string, unknown>,
  ) {
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey) throw new ConflictException('缺少资源消费幂等键');
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new ConflictException('资源消费数量无效');
    }
    const resourceType =
      resource === 'marketingExports' ? 'marketing_export' : 'sms';
    const existing = await this.prisma.subscriptionUsageEvent.findUnique({
      where: {
        technicianId_resourceType_idempotencyKey: {
          technicianId,
          resourceType,
          idempotencyKey: normalizedKey,
        },
      },
    });
    if (existing) return this.getCurrentForTechnician(technicianId);

    const current = await this.getCurrentForTechnician(technicianId);
    const entitlement = current.entitlements[resource];
    if (
      entitlement.limit != null &&
      entitlement.used + amount > entitlement.limit
    ) {
      const label = resource === 'marketingExports' ? '宣传导出' : '短信';
      await this.recordUpgradeTrigger(
        technicianId,
        `${resourceType}_quota_reached`,
        current.plan?.code,
        { amount },
      );
      throw new ForbiddenException(
        `当前套餐${label}额度已用完，请购买资源包或升级套餐`,
      );
    }
    const now = new Date();
    const period = this.monthPeriod(now);
    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionUsageEvent.create({
        data: {
          technicianId,
          resourceType,
          idempotencyKey: normalizedKey,
          amount,
          period,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
      const latestUsage = await tx.subscriptionResourceUsage.findUnique({
        where: { technicianId_period: { technicianId, period } },
      });
      const latestUsed =
        resource === 'marketingExports'
          ? (latestUsage?.marketingExports ?? 0)
          : (latestUsage?.smsSent ?? 0);
      if (
        entitlement.limit != null &&
        latestUsed + amount > entitlement.limit
      ) {
        const label = resource === 'marketingExports' ? '宣传导出' : '短信';
        throw new ForbiddenException(
          `当前套餐${label}额度已用完，请购买资源包或升级套餐`,
        );
      }
      await tx.subscriptionResourceUsage.upsert({
        where: { technicianId_period: { technicianId, period } },
        create: {
          technicianId,
          period,
          ...(resource === 'marketingExports'
            ? { marketingExports: amount }
            : { smsSent: amount }),
        },
        update:
          resource === 'marketingExports'
            ? { marketingExports: { increment: amount } }
            : { smsSent: { increment: amount } },
      });
    });
    return this.getCurrentForTechnician(technicianId);
  }

  async getSubscriptionMetrics(startDate?: string, endDate?: string) {
    const createdAt = this.dateRange(startDate, endDate);
    const [triggers, changes] = await Promise.all([
      this.prisma.subscriptionMetricEvent.groupBy({
        by: ['eventType', 'source', 'planCode'],
        where: createdAt ? { createdAt } : undefined,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.subscriptionChange.groupBy({
        by: ['reason'],
        where: createdAt ? { createdAt } : undefined,
        _count: { id: true },
      }),
    ]);
    return {
      upgradeTriggers: triggers.map((item) => ({
        eventType: item.eventType,
        source: item.source,
        planCode: item.planCode,
        count: item._count.id,
      })),
      subscriptionChanges: changes.map((item) => ({
        reason: item.reason,
        count: item._count.id,
      })),
    };
  }

  private async recordUpgradeTrigger(
    technicianId: number,
    source: string,
    planCode?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.subscriptionMetricEvent.create({
      data: {
        technicianId,
        eventType: 'upgrade_trigger',
        source,
        planCode,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  private dateRange(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    return {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate
        ? {
            lte: /^\d{4}-\d{2}-\d{2}$/.test(endDate)
              ? new Date(`${endDate}T23:59:59.999`)
              : new Date(endDate),
          }
        : {}),
    };
  }

  async previewPlanChange(technicianId: number, planId: number) {
    const [current, target] = await Promise.all([
      this.getCurrentForTechnician(technicianId),
      this.findPlanById(planId),
    ]);
    const direction =
      this.planLevel(target.code) >= this.planLevel(current.plan.code)
        ? 'upgrade'
        : 'downgrade';
    const effectiveAt =
      direction === 'downgrade' && current.expiredAt
        ? current.expiredAt
        : new Date();
    const affected = Object.entries(current.entitlements)
      .filter(([key]) => key in this.planLimits(target))
      .map(([key, entitlement]) => {
        const nextLimit = this.planLimits(target)[key];
        return {
          resource: key,
          used: entitlement.used,
          currentLimit: entitlement.limit,
          nextLimit,
          willBeReadOnly: nextLimit != null && entitlement.used > nextLimit,
        };
      });
    return {
      direction,
      effectiveAt,
      currentPlan: current.plan,
      targetPlan: this.mapPlan(target),
      affected,
      dataRetention: '历史客户、预约、作品和经营数据不会删除',
    };
  }

  async findSubscriptionChanges(technicianId: number) {
    return this.prisma.subscriptionChange.findMany({
      where: { technicianId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPlanById(id: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  async createPlan(dto: CreateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Plan with this code already exists');
    }

    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        code: dto.code,
        price: dto.price,
        billingCycle: dto.billingCycle,
        maxCustomers: dto.maxCustomers,
        maxMonthlyBookings: dto.maxMonthlyBookings,
        maxWorks: dto.maxWorks,
        maxStorageBytes: dto.maxStorageBytes,
        maxMarketingExports: dto.maxMarketingExports,
        maxMonthlySms: dto.maxMonthlySms,
        maxEmployees: dto.maxEmployees,
        maxBookingPages: dto.maxBookingPages,
        targetStage: dto.targetStage,
        description: dto.description,
        features: dto.features ? JSON.stringify(dto.features) : undefined,
        status: dto.status || 'active',
      },
    });
  }

  async updatePlan(id: number, dto: Partial<CreateSubscriptionPlanDto>) {
    await this.findPlanById(id);

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...dto,
        features: dto.features ? JSON.stringify(dto.features) : undefined,
      },
    });
  }

  async findTechnicianSubscriptions(technicianId?: number, status?: string) {
    const where: any = {};

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.technicianSubscription.findMany({
      where,
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        plan: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async updateTechnicianSubscription(
    technicianId: number,
    dto: UpdateTechnicianSubscriptionDto,
  ) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    const plan = await this.findPlanById(dto.planId);

    const existing = await this.prisma.technicianSubscription.findUnique({
      where: { technicianId },
      include: { plan: true },
    });

    const now = new Date();
    const shouldSchedule = Boolean(
      existing &&
      existing.expiredAt &&
      existing.expiredAt > now &&
      this.planLevel(plan.code) < this.planLevel(existing.plan.code) &&
      dto.applyAtPeriodEnd !== false,
    );
    if (shouldSchedule) {
      const effectiveAt = existing!.expiredAt!;
      const scheduled = await this.prisma.technicianSubscription.update({
        where: { technicianId },
        data: {
          pendingPlanCode: plan.code,
          changeEffectiveAt: effectiveAt,
        },
      });
      await this.prisma.subscriptionChange.create({
        data: {
          technicianId,
          fromPlanCode: existing!.plan.code,
          toPlanCode: plan.code,
          reason: 'downgrade_scheduled',
          effectiveAt,
        },
      });
      return scheduled;
    }

    const updated = await this.prisma.technicianSubscription.upsert({
      where: { technicianId },
      update: {
        planId: dto.planId,
        status: 'active',
        startedAt: new Date(),
        expiredAt:
          plan.billingCycle !== 'free'
            ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null,
        pendingPlanCode: null,
        changeEffectiveAt: null,
      },
      create: {
        technicianId,
        planId: dto.planId,
        status: 'active',
        startedAt: new Date(),
        expiredAt:
          plan.billingCycle !== 'free'
            ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null,
      },
    });
    await this.prisma.subscriptionChange.create({
      data: {
        technicianId,
        fromPlanCode: existing?.plan?.code ?? null,
        toPlanCode: plan.code,
        reason:
          existing &&
          this.planLevel(plan.code) > this.planLevel(existing.plan.code)
            ? 'upgrade'
            : 'admin_change',
        effectiveAt: now,
      },
    });
    return updated;
  }

  private async ensureFreePlan() {
    await this.ensureDefaultPlans();
    return this.prisma.subscriptionPlan.findUniqueOrThrow({
      where: { code: 'free' },
    });
  }

  private async ensureDefaultPlans() {
    const plans = [
      {
        code: 'free',
        name: '免费版',
        price: 0,
        billingCycle: 'free',
        maxCustomers: 30,
        maxMonthlyBookings: 30,
        maxWorks: 50,
        maxStorageBytes: 500 * 1024 * 1024,
        maxMarketingExports: 5,
        maxMonthlySms: 10,
        maxEmployees: 1,
        maxBookingPages: 1,
        targetStage: '新手体验、个人起步',
        description: '免费建立完整、规范的经营流程',
        features: ['customer_management', 'booking', 'works', 'basic_insights'],
      },
      {
        code: 'starter',
        name: '入门版',
        price: 29,
        billingCycle: 'monthly',
        maxCustomers: 150,
        maxMonthlyBookings: 150,
        maxWorks: 300,
        maxStorageBytes: 5 * 1024 * 1024 * 1024,
        maxMarketingExports: 30,
        maxMonthlySms: 30,
        maxEmployees: 1,
        maxBookingPages: 1,
        targetStage: '稳定经营的个人美甲师',
        description: '扩大经营规模并建立个人品牌',
        features: [
          'customer_management',
          'booking',
          'works',
          'branding',
          'monthly_insights',
          'basic_export',
          'repurchase_reminder',
        ],
      },
      {
        code: 'advanced',
        name: '高阶版',
        price: 79,
        billingCycle: 'monthly',
        maxCustomers: 500,
        maxMonthlyBookings: 500,
        maxWorks: 1500,
        maxStorageBytes: 30 * 1024 * 1024 * 1024,
        maxMarketingExports: 150,
        maxMonthlySms: 100,
        maxEmployees: 3,
        maxBookingPages: 3,
        targetStage: '成熟美甲师、小型工作室',
        description: '提升复购率、客户价值和经营效率',
        features: [
          'customer_management',
          'booking',
          'works',
          'branding',
          'insights',
          'full_export',
          'smart_repurchase',
          'customer_segmentation',
        ],
      },
      {
        code: 'ultimate',
        name: '终极版',
        price: 199,
        billingCycle: 'monthly',
        maxCustomers: 2000,
        maxMonthlyBookings: null,
        maxWorks: null,
        maxStorageBytes: 100 * 1024 * 1024 * 1024,
        maxMarketingExports: null,
        maxMonthlySms: 300,
        maxEmployees: 5,
        maxBookingPages: null,
        targetStage: '多人工作室',
        description: '支持团队化和多地点经营',
        features: [
          'customer_management',
          'booking',
          'works',
          'team_branding',
          'team_insights',
          'full_export',
          'automation',
          'team_management',
        ],
      },
    ];
    await Promise.all(
      plans.map((plan) =>
        this.prisma.subscriptionPlan.upsert({
          where: { code: plan.code },
          create: {
            ...plan,
            features: JSON.stringify(plan.features),
            status: 'active',
          },
          update: {},
        }),
      ),
    );
  }

  private toEntitlement(used: number, limit?: number | null) {
    const reached = limit != null && used >= limit;
    const percent =
      limit == null
        ? null
        : limit === 0
          ? used > 0
            ? 100
            : 0
          : Math.min(100, Math.round((used / limit) * 100));
    return {
      used,
      limit: limit ?? null,
      remaining: limit == null ? null : Math.max(0, limit - used),
      percent,
      reached,
      reminderLevel:
        percent == null
          ? 'normal'
          : percent >= 100
            ? 'limit'
            : percent >= 90
              ? 'warning'
              : percent >= 70
                ? 'notice'
                : 'normal',
    };
  }

  private async applyScheduledPlanChange(subscription: any, now: Date) {
    const target = await this.prisma.subscriptionPlan.findUnique({
      where: { code: subscription.pendingPlanCode },
    });
    if (!target || target.status !== 'active') {
      return this.prisma.technicianSubscription.update({
        where: { id: subscription.id },
        data: { pendingPlanCode: null, changeEffectiveAt: null },
        include: { plan: true },
      });
    }
    const updated = await this.prisma.technicianSubscription.update({
      where: { id: subscription.id },
      data: {
        planId: target.id,
        startedAt: now,
        expiredAt:
          target.billingCycle === 'free'
            ? null
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        pendingPlanCode: null,
        changeEffectiveAt: null,
      },
      include: { plan: true },
    });
    await this.prisma.subscriptionChange.create({
      data: {
        technicianId: subscription.technicianId,
        fromPlanCode: subscription.plan.code,
        toPlanCode: target.code,
        reason: 'downgrade_applied',
        effectiveAt: now,
      },
    });
    return updated;
  }

  private monthPeriod(now: Date) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private planLevel(code: string) {
    return ['free', 'starter', 'advanced', 'ultimate'].indexOf(code);
  }

  private planLimits(plan: any): Record<string, number | null> {
    return {
      customers: plan.maxCustomers,
      monthlyBookings: plan.maxMonthlyBookings,
      works: plan.maxWorks,
      storage: plan.maxStorageBytes,
      marketingExports: plan.maxMarketingExports,
      monthlySms: plan.maxMonthlySms,
      employees: plan.maxEmployees,
      bookingPages: plan.maxBookingPages,
    };
  }

  private mapPlan(plan: any) {
    return {
      ...plan,
      features: this.parseFeatures(plan.features),
    };
  }

  private activeSince(now: Date) {
    const date = new Date(now);
    date.setFullYear(date.getFullYear() - 1);
    return date;
  }

  private activeCustomerConditions(activeSince: Date) {
    return [
      { orders: { some: { createdAt: { gte: activeSince } } } },
      { revenues: { some: { createdAt: { gte: activeSince } } } },
      { followUps: { some: { createdAt: { gte: activeSince } } } },
      { workAccesses: { some: { createdAt: { gte: activeSince } } } },
    ];
  }

  private parseFeatures(value?: string | null): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }
}
