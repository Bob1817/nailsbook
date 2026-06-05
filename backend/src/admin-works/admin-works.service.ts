import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

@Injectable()
export class AdminWorksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    technicianId?: number;
    keyword?: string;
    isVisible?: boolean;
    isHomepageFeatured?: boolean;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, params.pageSize || 20);

    const where: any = {};
    if (params.technicianId) where.techId = params.technicianId;
    if (params.isVisible !== undefined) where.isVisible = params.isVisible;
    if (params.isHomepageFeatured !== undefined) where.isHomepageFeatured = params.isHomepageFeatured;
    if (params.keyword) {
      where.OR = [
        { title: { contains: params.keyword } },
        { tags: { contains: params.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.nailWork.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          technician: { select: { id: true, name: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.nailWork.count({ where }),
    ]);

    return {
      items: items.map(w => this.mapWork(w)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number) {
    const work = await this.prisma.nailWork.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true, favorites: true } },
      },
    });
    if (!work) throw new NotFoundException('作品不存在');
    return this.mapWork(work);
  }

  async toggleVisibility(id: number) {
    const work = await this.prisma.nailWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    const updated = await this.prisma.nailWork.update({
      where: { id },
      data: { isVisible: !work.isVisible },
    });
    return { id, isVisible: updated.isVisible };
  }

  async toggleHomepageFeatured(id: number) {
    const work = await this.prisma.nailWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    const updated = await this.prisma.nailWork.update({
      where: { id },
      data: { isHomepageFeatured: !work.isHomepageFeatured },
    });
    return { id, isHomepageFeatured: updated.isHomepageFeatured };
  }

  async updateTags(id: number, tags: string) {
    const work = await this.prisma.nailWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    await this.prisma.nailWork.update({ where: { id }, data: { tags } });
    return { id, tags };
  }

  async remove(id: number) {
    const work = await this.prisma.nailWork.findUnique({ where: { id } });
    if (!work) throw new NotFoundException('作品不存在');
    await this.prisma.nailWork.delete({ where: { id } });
    return { success: true };
  }

  private toAbsoluteUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${UPLOAD_BASE_URL}${url}`;
  }

  private mapWork(work: any) {
    let imageUrls: string[] = [];
    if (work.images) {
      try {
        const parsed = JSON.parse(work.images);
        if (Array.isArray(parsed)) imageUrls = parsed.filter((u: any) => typeof u === 'string');
      } catch {
        imageUrls = work.images.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    imageUrls = imageUrls.map((u) => this.toAbsoluteUrl(u) as string).filter(Boolean);

    return {
      id: work.id,
      title: work.title,
      coverUrl: this.toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null,
      imageUrls,
      description: work.description,
      tags: work.tags ? work.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      price: work.price,
      isVisible: work.isVisible,
      isPinned: work.isPinned,
      isFeatured: work.isFeatured,
      isHomepageFeatured: work.isHomepageFeatured,
      viewCount: work.viewCount,
      likeCount: work._count?.likes ?? 0,
      commentCount: work._count?.comments ?? 0,
      favoriteCount: work._count?.favorites ?? 0,
      technician: work.technician,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
    };
  }
}
