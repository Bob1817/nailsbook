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

@Injectable()
export class TechnicianServicesService {
  constructor(private readonly prisma: PrismaService) {}

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
    price?: number;
    durationMinutes?: number | null;
  }) {
    if (typeof service.name !== 'string' || !service.name.trim())
      throw new BadRequestException('请输入服务名称');
    if (!Number.isFinite(Number(service.price)) || Number(service.price) < 0)
      throw new BadRequestException('请输入有效服务价格');
    if (
      !Number.isInteger(Number(service.durationMinutes)) ||
      Number(service.durationMinutes) < 15
    )
      throw new BadRequestException('服务时长不能少于15分钟');
  }
}
