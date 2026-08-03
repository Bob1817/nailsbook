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
}

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findPlans() {
    return this.prisma.subscriptionPlan.findMany({
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
    const expired = Boolean(
      subscription?.expiredAt && subscription.expiredAt < now,
    );
    if (!subscription || expired || subscription.status !== 'active') {
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
    }
    const [customerCount, monthlyBookings] = await Promise.all([
      this.prisma.customer.count({ where: { technicianId } }),
      this.prisma.order.count({
        where: {
          technicianId,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
          status: { not: 'cancelled' },
        },
      }),
    ]);
    const features = this.parseFeatures(subscription.plan.features);
    return {
      id: subscription.id,
      status: subscription.status,
      startedAt: subscription.startedAt,
      expiredAt: subscription.expiredAt,
      plan: {
        id: subscription.plan.id,
        code: subscription.plan.code,
        name: subscription.plan.name,
        price: subscription.plan.price,
        billingCycle: subscription.plan.billingCycle,
        features,
        maxCustomers: subscription.plan.maxCustomers,
        maxMonthlyBookings: subscription.plan.maxMonthlyBookings,
      },
      usage: { customerCount, monthlyBookings },
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
      throw new ForbiddenException('当前套餐不包含此功能');
    }
    return current;
  }

  async assertCanCreateBooking(technicianId: number) {
    const current = await this.getCurrentForTechnician(technicianId);
    if (current.limits.monthlyBookingsReached) {
      throw new ForbiddenException('当前套餐本月预约额度已用完，请升级套餐');
    }
    return current;
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

    return this.prisma.technicianSubscription.upsert({
      where: { technicianId },
      update: {
        planId: dto.planId,
        status: 'active',
        startedAt: new Date(),
        expiredAt:
          plan.billingCycle !== 'free'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
      },
      create: {
        technicianId,
        planId: dto.planId,
        status: 'active',
        startedAt: new Date(),
        expiredAt:
          plan.billingCycle !== 'free'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
      },
    });
  }

  private async ensureFreePlan() {
    return this.prisma.subscriptionPlan.upsert({
      where: { code: 'free' },
      create: {
        name: '免费版',
        code: 'free',
        price: 0,
        billingCycle: 'free',
        maxCustomers: 100,
        maxMonthlyBookings: 100,
        features: JSON.stringify([
          'customer_management',
          'booking',
          'works',
          'referral_5_percent',
        ]),
        status: 'active',
      },
      update: {},
    });
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
