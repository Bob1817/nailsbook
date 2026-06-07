import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

interface CreateFeedbackInput {
  sourceType: 'client' | 'technician';
  sourceId: number;
  title: string;
  type: string;
  content: string;
}

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateFeedbackInput) {
    let sourceName: string | null = null;
    let sourcePhone: string | null = null;

    if (input.sourceType === 'client') {
      const user = await this.prisma.clientUser.findUnique({
        where: { id: input.sourceId },
        select: { nickname: true, phone: true },
      });
      sourceName = user?.nickname ?? null;
      sourcePhone = user?.phone ?? null;
    } else {
      const tech = await this.prisma.technician.findUnique({
        where: { id: input.sourceId },
        select: { name: true, phone: true },
      });
      sourceName = tech?.name ?? null;
      sourcePhone = tech?.phone ?? null;
    }

    return this.prisma.feedback.create({
      data: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceName,
        sourcePhone,
        title: (input.title ?? '').trim(),
        type: (input.type ?? '其他').trim(),
        content: (input.content ?? '').trim(),
      },
    });
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    sourceType?: string;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const where: { status?: string; sourceType?: string } = {};
    if (params.status) where.status = params.status;
    if (params.sourceType) where.sourceType = params.sourceType;

    const [total, list] = await this.prisma.$transaction([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { list, total, page, pageSize };
  }

  async resolve(id: number) {
    const found = await this.prisma.feedback.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('反馈不存在');
    return this.prisma.feedback.update({
      where: { id },
      data: { status: 'resolved' },
    });
  }
}
