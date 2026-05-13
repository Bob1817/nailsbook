import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ClientHomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome(clientUserId: number) {
    const binding = await this.getDefaultBinding(clientUserId);
    const [works, latestBooking] = await Promise.all([
      this.prisma.nailWork.findMany({
        where: {
          techId: binding.techId,
          isVisible: true,
          isFeatured: true, // 只显示精品作品
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 6,
        include: {
          likes: true,
          comments: true,
          technician: {
            select: { name: true, id: true }
          }
        },
      }),
      this.prisma.order.findFirst({
        where: {
          clientUserId,
          technicianId: binding.techId,
        },
        orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      technician: {
        id: binding.technician.id,
        name: binding.technician.name,
        phone: binding.technician.phone,
        avatarUrl: binding.technician.avatarUrl,
        city: binding.technician.city,
        serviceArea: binding.technician.serviceArea,
      },
      works: works.map((work) => ({
        ...this.mapWork(work),
        technicianId: work.techId,
      })),
      latestOrder: latestBooking
        ? {
            id: latestBooking.id,
            orderNo: latestBooking.orderNo,
            status: latestBooking.status,
            startTime: latestBooking.startTime,
            endTime: latestBooking.endTime,
            address: latestBooking.address,
          }
        : null,
    };
  }

  async getWorks(clientUserId: number) {
    const binding = await this.getDefaultBinding(clientUserId);
    const works = await this.prisma.nailWork.findMany({
      where: {
        techId: binding.techId,
        isVisible: true,
      },
      orderBy: [{ isPinned: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        likes: true,
        comments: true,
        technician: {
          select: { name: true, id: true }
        }
      },
    });

    return works.map((work) => ({
      ...this.mapWork(work),
      technicianId: work.techId,
    }));
  }

  async getWork(clientUserId: number, id: number) {
    const binding = await this.getDefaultBinding(clientUserId);
    const work = await this.prisma.nailWork.findFirst({
      where: {
        id,
        techId: binding.techId,
        isVisible: true,
      },
      include: {
        likes: true,
        favorites: true,
        comments: {
          orderBy: { createdAt: 'desc' }
        },
        technician: {
          select: { name: true, avatarUrl: true, id: true }
        }
      },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    // Check if current user has liked/favorited this work
    const isLiked = work.likes.some(like => like.clientId === clientUserId);
    const isFavorited = work.favorites.some(fav => fav.clientId === clientUserId);

    return {
      ...this.mapWork(work),
      isLiked,
      isFavorited,
      comments: work.comments.map(c => ({
        id: c.id,
        content: c.content,
        technicianId: c.technicianId,
        clientId: c.clientId,
        createdAt: c.createdAt,
      })),
    };
  }

  private async getDefaultBinding(clientUserId: number) {
    const binding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        status: 'active',
        isDefault: true,
      },
      include: {
        technician: true,
      },
    });

    if (binding) {
      return binding;
    }

    // Fallback to any active binding
    const anyBinding = await this.prisma.clientTechBinding.findFirst({
      where: {
        clientId: clientUserId,
        status: 'active',
      },
      include: {
        technician: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!anyBinding) {
      throw new NotFoundException('客户未绑定美甲师');
    }

    return anyBinding;
  }

  private mapWork(work: {
    id: number;
    title: string | null;
    coverUrl: string | null;
    images: string | null;
    description?: string | null;
    tags?: string | null;
    createdAt: Date;
    updatedAt: Date;
    likes?: { id: number }[];
    comments?: { id: number }[];
    technician?: { name: string | null; id?: number };
    techId?: number;
  }) {
    const imageUrls = this.parseImageUrls(work.images, work.coverUrl);
    const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

    const toAbsoluteUrl = (url: string | null): string | null => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      return `${UPLOAD_BASE_URL}${url}`;
    };

    // Get technicianId from either work.techId or work.technician.id
    const technicianId = work.techId ?? work.technician?.id;

    return {
      id: work.id,
      title: work.title,
      coverUrl: toAbsoluteUrl(work.coverUrl) ?? toAbsoluteUrl(imageUrls[0]) ?? null,
      imageUrls: imageUrls.map(url => toAbsoluteUrl(url)).filter(Boolean) as string[],
      description: work.description ?? null,
      tags: this.parseTags(work.tags ?? null),
      likeCount: work.likes?.length ?? 0,
      commentCount: work.comments?.length ?? 0,
      technicianName: work.technician?.name ?? '美甲师',
      technicianId: technicianId,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
    };
  }

  private parseImageUrls(images: string | null, coverUrl: string | null) {
    if (!images) {
      return coverUrl ? [coverUrl] : [];
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

    return coverUrl ? [coverUrl] : [];
  }

  private parseTags(tags: string | null) {
    if (!tags) {
      return [];
    }

    return tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  // Like functionality
  async likeWork(clientUserId: number, workId: number) {
    const binding = await this.getDefaultBinding(clientUserId);

    // Verify the work belongs to the bound technician
    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: binding.techId, isVisible: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    const existing = await this.prisma.nailWorkLike.findFirst({
      where: { workId, clientId: clientUserId },
    });

    if (existing) {
      await this.prisma.nailWorkLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await this.prisma.nailWorkLike.create({
      data: { workId, clientId: clientUserId },
    });
    return { liked: true };
  }

  // Favorite functionality
  async favoriteWork(clientUserId: number, workId: number) {
    const binding = await this.getDefaultBinding(clientUserId);

    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: binding.techId, isVisible: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    const existing = await this.prisma.nailWorkFavorite.findFirst({
      where: { workId, clientId: clientUserId },
    });

    if (existing) {
      await this.prisma.nailWorkFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.nailWorkFavorite.create({
      data: { workId, clientId: clientUserId },
    });
    return { favorited: true };
  }

  // Comment functionality
  async getComments(clientUserId: number, workId: number) {
    const binding = await this.getDefaultBinding(clientUserId);

    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: binding.techId, isVisible: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    return this.prisma.nailWorkComment.findMany({
      where: { workId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addComment(clientUserId: number, workId: number, content: string) {
    const binding = await this.getDefaultBinding(clientUserId);

    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: binding.techId, isVisible: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    return this.prisma.nailWorkComment.create({
      data: {
        workId,
        clientId: clientUserId,
        content,
      },
    });
  }
}
