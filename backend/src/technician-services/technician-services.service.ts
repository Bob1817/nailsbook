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
  price?: number;
  durationMinutes?: number;
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

type UpdateServiceDto = {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  price?: number;
  durationMinutes?: number;
  isActive?: boolean;
  sortOrder?: number;
};

@Injectable()
export class TechnicianServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(technicianId: number) {
    const technician = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      select: { id: true, serviceItems: true },
    });

    if (!technician) {
      throw new NotFoundException('美甲师不存在');
    }

    const services = technician.serviceItems
      ? JSON.parse(technician.serviceItems)
      : buildDefaultServiceItems();

    if (!technician.serviceItems) {
      await this.saveServices(technicianId, services);
    }

    return [...services].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
  }

  async create(technicianId: number, dto: CreateServiceDto) {
    const services = await this.list(technicianId);
    this.assertValidService(dto);
    const service: ServiceItem = {
      id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      price: dto.price,
      durationMinutes: dto.durationMinutes,
      isActive: true,
      sortOrder: services.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    services.push(service);
    await this.saveServices(technicianId, services);
    return service;
  }

  async update(technicianId: number, id: string, dto: UpdateServiceDto) {
    const services = await this.list(technicianId);
    const index = services.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new NotFoundException('服务不存在');
    }

    const updated = {
      ...services[index],
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.assertValidService(updated);
    services[index] = updated;

    await this.saveServices(technicianId, services);
    return services[index];
  }

  async delete(technicianId: number, id: string) {
    const services = await this.list(technicianId);
    const filtered = services
      .filter((item) => item.id !== id)
      .map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      }));
    await this.saveServices(technicianId, filtered);
  }

  async toggleStatus(technicianId: number, id: string) {
    const services = await this.list(technicianId);
    const target = services.find((item) => item.id === id);

    if (!target) {
      throw new NotFoundException('服务不存在');
    }

    return this.update(technicianId, id, { isActive: !target.isActive });
  }

  private async saveServices(technicianId: number, services: ServiceItem[]) {
    await this.prisma.technician.update({
      where: { id: technicianId },
      data: {
        serviceItems: JSON.stringify(services),
      },
    });
  }

  private assertValidService(service: Partial<ServiceItem>) {
    if (typeof service.name !== 'string' || !service.name.trim()) {
      throw new BadRequestException('请输入服务名称');
    }
    if (!Number.isFinite(Number(service.price)) || Number(service.price) < 0) {
      throw new BadRequestException('请输入有效服务价格');
    }
    if (
      !Number.isInteger(Number(service.durationMinutes)) ||
      Number(service.durationMinutes) < 15
    ) {
      throw new BadRequestException('服务时长不能少于15分钟');
    }
  }
}
