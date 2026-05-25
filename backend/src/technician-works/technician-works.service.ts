import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWorkDto, UpdateWorkDto } from './dto/create-work.dto';

// Configurable base URL for uploads
const UPLOAD_BASE_URL = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

@Injectable()
export class TechnicianWorksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(technicianId: number) {
    const works = await this.prisma.nailWork.findMany({
      where: { techId: technicianId },
      orderBy: [
        { isPinned: 'desc' },
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        likes: true,
        favorites: true,
        comments: true,
        technician: {
          select: { name: true },
        },
      },
    });

    return works.map((work) => this.mapWork(work, technicianId));
  }

  async findOne(technicianId: number, id: number) {
    const work = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
      include: {
        likes: true,
        favorites: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    return this.mapWork(work, technicianId);
  }

  async create(technicianId: number, dto: CreateWorkDto) {
    const work = await this.prisma.nailWork.create({
      data: {
        techId: technicianId,
        title: dto.title,
        coverUrl: dto.coverUrl ?? null,
        images: dto.images ?? null,
        description: dto.description ?? null,
        tags: dto.tags ?? null,
        isVisible: dto.isVisible ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        likes: true,
        favorites: true,
        comments: true,
      },
    });

    return this.mapWork(work, technicianId);
  }

  async update(technicianId: number, id: number, dto: UpdateWorkDto) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    const work = await this.prisma.nailWork.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: {
        likes: true,
        favorites: true,
        comments: true,
      },
    });

    return this.mapWork(work, technicianId);
  }

  async remove(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    await this.prisma.nailWork.delete({
      where: { id },
    });

    return { success: true };
  }

  async toggleVisible(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    const work = await this.prisma.nailWork.update({
      where: { id },
      data: { isVisible: !existing.isVisible },
      include: {
        likes: true,
        favorites: true,
        comments: true,
      },
    });

    return this.mapWork(work, technicianId);
  }

  // Like functionality
  async likeWork(workId: number, technicianId?: number, clientId?: number) {
    if (!technicianId && !clientId) {
      throw new BadRequestException(
        'Must provide either technicianId or clientId',
      );
    }

    const existing = await this.prisma.nailWorkLike.findFirst({
      where: {
        workId,
        ...(technicianId ? { technicianId } : { clientId }),
      },
    });

    if (existing) {
      // Unlike
      await this.prisma.nailWorkLike.delete({
        where: { id: existing.id },
      });
      return { liked: false };
    }

    // Like
    await this.prisma.nailWorkLike.create({
      data: {
        workId,
        technicianId,
        clientId,
      },
    });
    return { liked: true };
  }

  // Favorite functionality
  async favoriteWork(workId: number, technicianId?: number, clientId?: number) {
    if (!technicianId && !clientId) {
      throw new BadRequestException(
        'Must provide either technicianId or clientId',
      );
    }

    const existing = await this.prisma.nailWorkFavorite.findFirst({
      where: {
        workId,
        ...(technicianId ? { technicianId } : { clientId }),
      },
    });

    if (existing) {
      // Remove favorite
      await this.prisma.nailWorkFavorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false };
    }

    // Add favorite
    await this.prisma.nailWorkFavorite.create({
      data: {
        workId,
        technicianId,
        clientId,
      },
    });
    return { favorited: true };
  }

  async togglePinned(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    const work = await this.prisma.nailWork.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
      include: {
        likes: true,
        favorites: true,
        comments: true,
        technician: { select: { name: true } },
      },
    });

    return this.mapWork(work, technicianId);
  }

  async toggleFeatured(technicianId: number, id: number) {
    const existing = await this.prisma.nailWork.findFirst({
      where: { id, techId: technicianId },
    });

    if (!existing) {
      throw new NotFoundException('作品不存在');
    }

    const work = await this.prisma.nailWork.update({
      where: { id },
      data: { isFeatured: !existing.isFeatured },
      include: {
        likes: true,
        favorites: true,
        comments: true,
        technician: { select: { name: true } },
      },
    });

    return this.mapWork(work, technicianId);
  }

  async getComments(workId: number) {
    return this.prisma.nailWorkComment.findMany({
      where: { workId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addComment(
    workId: number,
    content: string,
    technicianId?: number,
    clientId?: number,
  ) {
    if (!technicianId && !clientId) {
      throw new BadRequestException(
        'Must provide either technicianId or clientId',
      );
    }

    const comment = await this.prisma.nailWorkComment.create({
      data: {
        workId,
        content,
        technicianId,
        clientId,
      },
    });

    return comment;
  }

  async deleteComment(commentId: number, technicianId: number) {
    const comment = await this.prisma.nailWorkComment.findFirst({
      where: { id: commentId },
      include: { work: true },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (
      comment.work.techId !== technicianId &&
      comment.technicianId !== technicianId
    ) {
      throw new BadRequestException('无权删除此评论');
    }

    await this.prisma.nailWorkComment.delete({
      where: { id: commentId },
    });

    return { success: true };
  }

  async markCommentsAsRead(workId: number, technicianId: number) {
    // Verify the work belongs to this technician
    const work = await this.prisma.nailWork.findFirst({
      where: { id: workId, techId: technicianId },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    // Mark all unread comments as read
    await this.prisma.nailWorkComment.updateMany({
      where: { workId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  private toAbsoluteUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${UPLOAD_BASE_URL}${url}`;
  }

  private mapWork(
    work: {
      id: number;
      title: string | null;
      coverUrl: string | null;
      images: string | null;
      description: string | null;
      tags: string | null;
      isVisible: boolean;
      isPinned?: boolean;
      isFeatured?: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
      likes?: {
        id: number;
        technicianId?: number | null;
        clientId?: number | null;
      }[];
      favorites?: {
        id: number;
        technicianId?: number | null;
        clientId?: number | null;
      }[];
      comments?: { id: number; isRead?: boolean }[];
      technician?: { name: string | null };
    },
    currentTechnicianId?: number,
  ) {
    const rawImageUrls = this.parseImageUrls(work.images, work.coverUrl);
    const imageUrls = rawImageUrls
      .map((url) => this.toAbsoluteUrl(url))
      .filter(Boolean) as string[];
    const coverUrl = this.toAbsoluteUrl(work.coverUrl) ?? imageUrls[0] ?? null;

    // Check if current technician has liked/favorited this work
    const isLiked = currentTechnicianId
      ? (work.likes?.some(
          (like) => like.technicianId === currentTechnicianId,
        ) ?? false)
      : false;
    const isFavorited = currentTechnicianId
      ? (work.favorites?.some(
          (fav) => fav.technicianId === currentTechnicianId,
        ) ?? false)
      : false;

    // Count unread comments
    const unreadComments = work.comments?.filter((c) => !c.isRead).length ?? 0;

    return {
      id: work.id,
      title: work.title,
      coverUrl,
      imageUrls,
      description: work.description ?? null,
      tags: this.parseTags(work.tags ?? null),
      isVisible: work.isVisible,
      isPinned: work.isPinned ?? false,
      isFeatured: work.isFeatured ?? false,
      sortOrder: work.sortOrder,
      likeCount: work.likes?.length ?? 0,
      favoriteCount: work.favorites?.length ?? 0,
      commentCount: work.comments?.length ?? 0,
      unreadComments,
      isLiked,
      isFavorited,
      technicianName: work.technician?.name ?? '美甲师',
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
        return parsed.filter(
          (item): item is string => typeof item === 'string',
        );
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
}
