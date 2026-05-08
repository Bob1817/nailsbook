import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateClientDesignDto } from './dto/create-client-design.dto';
import { UpdateClientDesignDto } from './dto/update-client-design.dto';

@Injectable()
export class ClientDesignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientUserId: number, dto: CreateClientDesignDto) {
    // Get default binding for creation
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        status: 'active',
        isDefault: true,
      },
    });

    if (!binding) {
      // Fallback to any active binding
      const anyBinding = await this.prisma.clientTechBinding.findFirst({
        where: {
          clientId: clientUserId,
          status: 'active',
        },
      });
      if (!anyBinding) {
        throw new NotFoundException('客户未绑定美甲师');
      }
    }

    const techId = dto.techId || binding?.techId;

    if (!techId) {
      throw new NotFoundException('请选择美甲师');
    }

    // Verify binding exists for this tech
    const techBinding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        techId: techId,
        status: 'active',
      },
    });

    if (!techBinding) {
      throw new NotFoundException('您未绑定该美甲师');
    }

    const design = await this.prisma.clientDesignRequest.create({
      data: {
        clientId: clientUserId,
        techId: techId,
        title: dto.title ?? null,
        images: JSON.stringify(dto.imageUrls),
        description: dto.description ?? null,
        status: 'pending_quote',
      },
    });

    return this.mapDesign(design);
  }

  async findAll(clientUserId: number) {
    const designs = await this.prisma.clientDesignRequest.findMany({
      where: { clientId: clientUserId },
      orderBy: { createdAt: 'desc' },
    });

    return designs.map((design) => this.mapDesign(design));
  }

  async findOne(clientUserId: number, id: number) {
    const design = await this.prisma.clientDesignRequest.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            homeService: true,
            shopService: true,
            shopAddresses: true,
          },
        },
      },
    });

    if (!design) {
      throw new NotFoundException('设计需求不存在');
    }

    return this.mapDesign(design);
  }

  async update(clientUserId: number, id: number, dto: UpdateClientDesignDto) {
    const design = await this.prisma.clientDesignRequest.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
    });

    if (!design) {
      throw new NotFoundException('设计需求不存在');
    }

    // Only allow editing if status is pending_quote
    if (design.status !== 'pending_quote') {
      throw new NotFoundException('只能编辑待报价状态的设计');
    }

    const updated = await this.prisma.clientDesignRequest.update({
      where: { id },
      data: {
        title: dto.title ?? design.title,
        description: dto.description ?? design.description,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            homeService: true,
            shopService: true,
            shopAddresses: true,
          },
        },
      },
    });

    return this.mapDesign(updated);
  }

  async remove(clientUserId: number, id: number) {
    const design = await this.prisma.clientDesignRequest.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
    });

    if (!design) {
      throw new NotFoundException('设计需求不存在');
    }

    // Only allow deleting if status is pending_quote
    if (design.status !== 'pending_quote') {
      throw new NotFoundException('只能删除待报价状态的设计');
    }

    await this.prisma.clientDesignRequest.delete({
      where: { id },
    });

    return { success: true };
  }

  async switchTechnician(clientUserId: number, id: number, techId: number) {
    const design = await this.prisma.clientDesignRequest.findFirst({
      where: {
        id,
        clientId: clientUserId,
      },
    });

    if (!design) {
      throw new NotFoundException('设计需求不存在');
    }

    // Only allow switching if status is pending_quote
    if (design.status !== 'pending_quote') {
      throw new NotFoundException('只能切换待报价状态的设计');
    }

    // Verify the new technician is bound to this client
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        techId: techId,
        status: 'active',
      },
    });

    if (!binding) {
      throw new NotFoundException('您未绑定该美甲师');
    }

    const updated = await this.prisma.clientDesignRequest.update({
      where: { id },
      data: { techId },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            homeService: true,
            shopService: true,
            shopAddresses: true,
          },
        },
      },
    });

    return this.mapDesign(updated);
  }

  private mapDesign(design: any) {
    return {
      id: design.id,
      clientId: design.clientId,
      techId: design.techId,
      title: design.title,
      imageUrls: this.parseImageUrls(design.images),
      description: design.description,
      quotePrice: design.quotePrice ?? null,
      quoteRemark: design.quoteRemark ?? null,
      status: design.status,
      technician: design.technician
        ? {
            id: design.technician.id,
            name: design.technician.name,
            avatarUrl: design.technician.avatarUrl,
            homeService: design.technician.homeService,
            shopService: design.technician.shopService,
            shopAddresses: design.technician.shopAddresses
              ? JSON.parse(design.technician.shopAddresses)
              : [],
          }
        : null,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
    };
  }

  private parseImageUrls(images: string | null) {
    if (!images) {
      return [];
    }

    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return images
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }
}
