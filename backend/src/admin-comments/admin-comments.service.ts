import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: 'normal' | 'hidden';
    authorType?: 'client' | 'technician';
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, params.pageSize || 20);

    const where: any = {};
    if (params.status === 'normal') where.isHidden = false;
    if (params.status === 'hidden') where.isHidden = true;
    if (params.authorType === 'client') {
      where.clientId = { not: null };
      where.technicianId = null;
    }
    if (params.authorType === 'technician') {
      where.technicianId = { not: null };
      where.clientId = null;
    }
    if (params.keyword) {
      where.content = { contains: params.keyword };
    }

    const [items, total] = await Promise.all([
      this.prisma.nailWorkComment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, nickname: true } },
          technician: { select: { id: true, name: true } },
          work: {
            select: {
              id: true,
              title: true,
              technician: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.nailWorkComment.count({ where }),
    ]);

    return {
      items: items.map((c) => this.mapComment(c)),
      total,
      page,
      pageSize,
    };
  }

  async toggleHide(id: number) {
    const comment = await this.prisma.nailWorkComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    const updated = await this.prisma.nailWorkComment.update({
      where: { id },
      data: { isHidden: !comment.isHidden },
    });
    return { id, isHidden: updated.isHidden };
  }

  async remove(id: number) {
    const comment = await this.prisma.nailWorkComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    // Admin hard-deletes regardless of replies
    await this.prisma.nailWorkComment.delete({ where: { id } });
    return { success: true };
  }

  private mapComment(c: any) {
    const authorType = c.technicianId ? 'technician' : 'client';
    const authorName = authorType === 'technician'
      ? (c.technician?.name ?? '美甲师')
      : (c.client?.nickname ?? '客户');

    return {
      id: c.id,
      workId: c.workId,
      parentId: c.parentId,
      content: c.content,
      isHidden: c.isHidden,
      isPinned: c.isPinned,
      authorType,
      authorName,
      work: c.work
        ? {
            id: c.work.id,
            title: c.work.title,
            technicianName: c.work.technician?.name ?? '',
          }
        : null,
      createdAt: c.createdAt,
    };
  }
}
