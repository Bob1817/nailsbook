import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.featureFlag.findMany({ orderBy: { featureCode: 'asc' } });
  }

  async findOne(id: number) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('功能开关不存在');
    return flag;
  }

  async update(id: number, data: { enabled?: boolean; enabledPlans?: string; description?: string }) {
    await this.findOne(id);
    return this.prisma.featureFlag.update({ where: { id }, data });
  }

  async toggle(id: number) {
    const flag = await this.findOne(id);
    return this.prisma.featureFlag.update({
      where: { id },
      data: { enabled: !flag.enabled },
    });
  }

  async isEnabled(featureCode: string, planCode?: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { featureCode } });
    if (!flag || !flag.enabled) return false;
    if (!planCode || !flag.enabledPlans) return flag.enabled;
    try {
      const plans: string[] = JSON.parse(flag.enabledPlans);
      return plans.includes(planCode);
    } catch {
      return flag.enabled;
    }
  }
}
