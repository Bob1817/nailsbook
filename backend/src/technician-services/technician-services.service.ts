import { depositFen, SURCHARGE_CATEGORIES } from '../orders/booking-proposal';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  buildDefaultServiceItems,
  ServiceCategory,
} from '../common/default-service-items';

type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
type CreateServiceDto = {
  name: string;
  description?: string;
  category: ServiceCategory;
  price?: number;
  durationMinutes?: number;
};
type UpdateServiceDto = Partial<CreateServiceDto> & {
  isActive?: boolean;
  sortOrder?: number;
};
const SERVICE_CATEGORIES: ServiceCategory[] = [
  'basic_care',
  'color_style',
  'extension_reinforcement',
  'removal',
  'surcharge_home',
  'surcharge_night',
  'surcharge_holiday',
];

@Injectable()
export class TechnicianServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async pricingSettings(technicianId: number) {
    const settings = await this.prisma.technician.findUnique({ where: { id: technicianId }, select: { depositMode: true, depositValue: true } });
    if (!settings) throw new NotFoundException('美甲师不存在');
    return settings;
  }

  async updatePricingSettings(technicianId: number, dto: { depositMode: string; depositValue: number }) {
    depositFen(null, dto.depositMode, dto.depositValue);
    return this.prisma.technician.update({ where: { id: technicianId }, data: {
      depositMode: dto.depositMode, depositValue: dto.depositMode === 'none' ? 0 : dto.depositValue,
    }, select: { depositMode: true, depositValue: true } });
  }

  async loyaltySettings(technicianId: number) {
    const row = await this.prisma.technician.findUnique({ where: { id: technicianId }, select: { loyaltySettings: true } });
    if (!row) throw new NotFoundException('美甲师不存在');
    return row.loyaltySettings ? JSON.parse(row.loyaltySettings) : { enabled: false, pointsPerYuan: 0, tiers: [] };
  }

  async updateLoyaltySettings(technicianId: number, input: unknown) {
    const dto = input as { enabled?: boolean; pointsPerYuan?: number; tiers?: Array<{ id?: string; name?: string; thresholdType?: string; thresholdValue?: number; discountPercent?: number; benefits?: string[] }> };
    const pointsPerYuan = Number(dto?.pointsPerYuan || 0);
    if (!Number.isFinite(pointsPerYuan) || pointsPerYuan < 0 || pointsPerYuan > 100) throw new BadRequestException('积分比例应为0到100');
    if (!Array.isArray(dto?.tiers) || dto.tiers.length > 10) throw new BadRequestException('会员等级设置无效');
    const tiers = dto.tiers.map((tier, index) => {
      const name = String(tier.name || '').trim();
      const thresholdType = String(tier.thresholdType || 'visits');
      const thresholdValue = Number(tier.thresholdValue);
      const discountPercent = Number(tier.discountPercent || 0);
      if (!name || !['visits', 'spend', 'points'].includes(thresholdType) || !Number.isFinite(thresholdValue) || thresholdValue < 0 || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) throw new BadRequestException(`第${index + 1}个会员等级设置无效`);
      return { id: String(tier.id || `tier_${index + 1}`), name, thresholdType, thresholdValue, discountPercent, benefits: (Array.isArray(tier.benefits) ? tier.benefits : []).map(String).map(v => v.trim()).filter(Boolean).slice(0, 8) };
    });
    const settings = { enabled: Boolean(dto.enabled), pointsPerYuan, tiers };
    await this.prisma.technician.update({ where: { id: technicianId }, data: { loyaltySettings: JSON.stringify(settings) } });
    return settings;
  }

  async list(technicianId: number) {
    await this.ensureImported(technicianId);
    return this.readServices(technicianId);
  }

  async create(technicianId: number, dto: CreateServiceDto) {
    this.assertValidService(dto);
    await this.ensureImported(technicianId);
    const count = await this.prisma.service.count({
      where: { technicianId, archivedAt: null },
    });
    const publicId = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await this.prisma.service.create({
      data: {
        publicId,
        technicianId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        category: dto.category,
        durationMinutes: Number(dto.durationMinutes),
        priceType: 'fixed',
        priceMinFen: this.toFen(Number(dto.price)),
        priceMaxFen: this.toFen(Number(dto.price)),
        isBookable: true,
        sortOrder: count + 1,
      },
    });
    await this.syncLegacyMirror(technicianId);
    return (await this.readServices(technicianId)).find(
      (item) => item.id === publicId,
    );
  }

  async update(technicianId: number, id: string, dto: UpdateServiceDto) {
    await this.ensureImported(technicianId);
    const existing = await this.prisma.service.findFirst({
      where: { technicianId, publicId: id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('服务不存在');
    this.assertValidService({
      name: dto.name ?? existing.name,
      category: dto.category ?? existing.category,
      price:
        dto.price ??
        (existing.priceMinFen == null
          ? Number.NaN
          : existing.priceMinFen / 100),
      durationMinutes: dto.durationMinutes ?? existing.durationMinutes,
    });
    await this.prisma.service.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.price !== undefined
          ? {
              priceMinFen: this.toFen(dto.price),
              priceMaxFen: this.toFen(dto.price),
            }
          : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: Number(dto.durationMinutes) }
          : {}),
        ...(dto.isActive !== undefined ? { isBookable: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.syncLegacyMirror(technicianId);
    return (await this.readServices(technicianId)).find(
      (item) => item.id === id,
    );
  }

  async delete(technicianId: number, id: string) {
    await this.ensureImported(technicianId);
    const existing = await this.prisma.service.findFirst({
      where: { technicianId, publicId: id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('服务不存在');
    await this.prisma.service.update({
      where: { id: existing.id },
      data: { archivedAt: new Date(), isBookable: false },
    });
    await this.syncLegacyMirror(technicianId);
  }

  async toggleStatus(technicianId: number, id: string) {
    await this.ensureImported(technicianId);
    const existing = await this.prisma.service.findFirst({
      where: { technicianId, publicId: id, archivedAt: null },
    });
    if (!existing) throw new NotFoundException('服务不存在');
    return this.update(technicianId, id, { isActive: !existing.isBookable });
  }

  private async ensureImported(technicianId: number) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: { id: true, serviceItems: true },
    });
    if (!technician) throw new NotFoundException('美甲师不存在');
    if (
      await this.prisma.service.count({
        where: { technicianId, archivedAt: null },
      })
    )
      return;
    const legacy = technician.serviceItems
      ? JSON.parse(technician.serviceItems)
      : buildDefaultServiceItems();
    for (const [index, item] of legacy.entries()) {
      if (
        !item?.name ||
        !Number.isFinite(Number(item.price)) ||
        !Number.isFinite(Number(item.durationMinutes)) ||
        Number(item.durationMinutes) < 1
      ) {
        continue;
      }
      await this.prisma.service.create({
        data: {
          publicId: String(item.id),
          technicianId,
          name: String(item.name).trim(),
          description: item.description?.trim() || null,
          category: item.category,
          durationMinutes: Number(item.durationMinutes),
          priceType: 'fixed',
          priceMinFen: this.toFen(Number(item.price)),
          priceMaxFen: this.toFen(Number(item.price)),
          isBookable: item.isActive !== false,
          sortOrder: Number(item.sortOrder) || index + 1,
        },
      });
    }
    await this.syncLegacyMirror(technicianId);
  }

  private async readServices(technicianId: number): Promise<ServiceItem[]> {
    const services = await this.prisma.service.findMany({
      where: { technicianId, archivedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return services.map((item) => ({
      id: item.publicId,
      name: item.name,
      description: item.description || undefined,
      category: item.category as ServiceCategory,
      price: (item.priceMinFen ?? 0) / 100,
      durationMinutes: item.durationMinutes ?? 0,
      isActive: item.isBookable,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  private async syncLegacyMirror(technicianId: number) {
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: {
        serviceItems: JSON.stringify(await this.readServices(technicianId)),
      },
    });
  }
  private toFen(value: number) {
    return Math.round(Number(value) * 100);
  }
  private assertValidService(service: {
    name?: string;
    category?: string;
    price?: number;
    durationMinutes?: number | null;
  }) {
    if (typeof service.name !== 'string' || !service.name.trim())
      throw new BadRequestException('请输入服务名称');
    if (!SERVICE_CATEGORIES.includes(service.category as ServiceCategory))
      throw new BadRequestException('服务分类无效');
    if (!Number.isFinite(Number(service.price)) || Number(service.price) < 0)
      throw new BadRequestException('请输入有效服务价格');
    if (
      SURCHARGE_CATEGORIES.includes(service.category || '') &&
      Number(service.durationMinutes) !== 0
    )
      throw new BadRequestException('附加服务不设置服务时长');
    if (
      !Number.isInteger(Number(service.durationMinutes)) ||
      Number(service.durationMinutes) < (SURCHARGE_CATEGORIES.includes(service.category || '') ? 0 : 15)
    )
      throw new BadRequestException('服务时长不能少于15分钟');
  }
}
