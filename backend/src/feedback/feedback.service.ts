import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

interface CreateFeedbackInput {
  sourceType: 'client' | 'technician';
  sourceId: number;
  title: string;
  type: string;
  content: string;
  attachmentUrls?: string[];
}

const FEEDBACK_STATUSES = ['pending', 'processing', 'resolved'] as const;

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateFeedbackInput) {
    const title = (input.title ?? '').trim();
    const content = (input.content ?? '').trim();
    if (!title || !content)
      throw new BadRequestException('请填写反馈标题和内容');
    if (title.length > 30 || content.length > 500)
      throw new BadRequestException('反馈内容超出长度限制');
    if (input.type?.trim() === '账号注销申请')
      throw new BadRequestException('请使用账号注销入口提交申请');
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
        title,
        type: (input.type ?? '其他').trim(),
        content,
        attachmentUrls: JSON.stringify(input.attachmentUrls ?? []),
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

    return {
      list: list.map((item) => ({
        ...item,
        attachmentUrls: this.parseAttachmentUrls(item.attachmentUrls),
      })),
      total,
      page,
      pageSize,
    };
  }

  async findMine(sourceType: 'client' | 'technician', sourceId: number) {
    const list = await this.prisma.feedback.findMany({
      where: { sourceType, sourceId },
      orderBy: { createdAt: 'desc' },
    });
    return { list: list.map((item) => this.serialize(item)) };
  }

  async findMineById(
    id: number,
    sourceType: 'client' | 'technician',
    sourceId: number,
  ) {
    const item = await this.prisma.feedback.findFirst({
      where: { id, sourceType, sourceId },
    });
    if (!item) throw new NotFoundException('反馈不存在');
    return this.serialize(item);
  }

  async findById(id: number) {
    const item = await this.prisma.feedback.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('反馈不存在');
    return this.serialize(item);
  }

  async reply(id: number, input: { status: string; replyContent?: string }) {
    const found = await this.prisma.feedback.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('反馈不存在');
    if (
      !FEEDBACK_STATUSES.includes(
        input.status as (typeof FEEDBACK_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('反馈状态无效');
    }
    const replyContent = (input.replyContent ?? '').trim();
    if (replyContent.length > 1000)
      throw new BadRequestException('回复内容超出长度限制');
    if (input.status === 'resolved' && !replyContent && !found.replyContent) {
      throw new BadRequestException('完成反馈前请填写回复内容');
    }
    const item = await this.prisma.feedback.update({
      where: { id },
      data: {
        status: input.status,
        replyContent: replyContent || found.replyContent,
        repliedAt: replyContent ? new Date() : found.repliedAt,
      },
    });
    return this.serialize(item);
  }

  async resolve(id: number) {
    const found = await this.prisma.feedback.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('反馈不存在');
    if (found.type === '账号注销申请')
      throw new BadRequestException(
        '请引导用户从账号注销入口提交申请，普通反馈不能执行注销',
      );
    return this.prisma.feedback.update({
      where: { id },
      data: { status: 'resolved' },
    });
  }

  private parseAttachmentUrls(raw: string | null) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((url) => typeof url === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private serialize<T extends { attachmentUrls: string | null }>(item: T) {
    return {
      ...item,
      attachmentUrls: this.parseAttachmentUrls(item.attachmentUrls),
    };
  }
}
