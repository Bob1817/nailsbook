import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, params.pageSize || 20);
    const where: any = params.status ? { status: params.status } : {};

    const [items, total] = await Promise.all([
      this.prisma.nailWorkReport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { status: 'asc' },   // pending first
          { createdAt: 'desc' },
        ],
        include: {
          comment: {
            select: {
              id: true,
              content: true,
              work: { select: { id: true, title: true } },
            },
          },
        },
      }),
      this.prisma.nailWorkReport.count({ where }),
    ]);

    const pendingCount = await this.prisma.nailWorkReport.count({
      where: { status: 'pending' },
    });

    return { items, total, page, pageSize, pendingCount };
  }

  async resolve(id: number) {
    const report = await this.prisma.nailWorkReport.findUnique({
      where: { id },
      include: { comment: true },
    });
    if (!report) throw new NotFoundException('举报记录不存在');

    // Delete the reported comment (admin hard delete).
    // NailWorkReport.comment has onDelete: Cascade, so deleting the comment
    // also removes all reports for it.
    await this.prisma.nailWorkComment.delete({ where: { id: report.commentId } });

    return { success: true };
  }

  async dismiss(id: number) {
    const report = await this.prisma.nailWorkReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('举报记录不存在');
    await this.prisma.nailWorkReport.update({
      where: { id },
      data: { status: 'dismissed' },
    });
    return { success: true };
  }
}
