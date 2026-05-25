import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type ServiceCategory =
  | 'basic_care'
  | 'color_style'
  | 'extension_reinforcement'
  | 'removal';

type ServiceItem = {
  id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type CreateServiceDto = {
  name: string;
  description?: string;
  category: ServiceCategory;
};

type UpdateServiceDto = {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  isActive?: boolean;
  sortOrder?: number;
};

const buildDefaultServices = (): ServiceItem[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'svc_basic_care_1',
      name: '基础护理与修形',
      description: '指甲修剪、修形、去死皮、护理等基础服务',
      category: 'basic_care',
      isActive: true,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'svc_color_style_1',
      name: '色彩与款式制作',
      description: '纯色美甲、彩绘、渐变、贴纸等款式设计服务',
      category: 'color_style',
      isActive: true,
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'svc_extension_1',
      name: '指甲延长与加固',
      description: '甲片延长、光疗延长、指甲加固等服务',
      category: 'extension_reinforcement',
      isActive: true,
      sortOrder: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'svc_removal_1',
      name: '卸甲服务',
      description: '卸除甲油胶、卸甲片等服务',
      category: 'removal',
      isActive: true,
      sortOrder: 4,
      createdAt: now,
      updatedAt: now,
    },
  ];
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
      : buildDefaultServices();

    if (!technician.serviceItems) {
      await this.saveServices(technicianId, services);
    }

    return [...services].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
  }

  async create(technicianId: number, dto: CreateServiceDto) {
    const services = await this.list(technicianId);
    const service: ServiceItem = {
      id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: dto.name,
      description: dto.description,
      category: dto.category,
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

    services[index] = {
      ...services[index],
      ...dto,
      updatedAt: new Date().toISOString(),
    };

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
}
