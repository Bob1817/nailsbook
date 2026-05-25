import {
  Injectable,
  NotFoundException,
  ConflictException,
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
}
