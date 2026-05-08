import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export class CreateSubscriptionPlanDto {
  name: string;
  code: string;
  price: number;
  billingCycle: string;
  maxCustomers?: number;
  maxMonthlyBookings?: number;
  features?: string[];
  status?: string;
}

export class UpdateTechnicianSubscriptionDto {
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

  async updateTechnicianSubscription(technicianId: number, dto: UpdateTechnicianSubscriptionDto) {
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
        expiredAt: plan.billingCycle !== 'free' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
          : null,
      },
      create: {
        technicianId,
        planId: dto.planId,
        status: 'active',
        startedAt: new Date(),
        expiredAt: plan.billingCycle !== 'free'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
      },
    });
  }
}
