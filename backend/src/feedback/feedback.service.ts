import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DingtalkAlertService } from '../notifications/dingtalk-alert.service';
import { WechatOfficialAlertService } from '../wechat-official/wechat-official-alert.service';

interface CreateFeedbackInput {
  sourceType: 'client' | 'technician';
  sourceId: number;
  title: string;
  type: string;
  content: string;
  attachmentUrls?: string[];
  contactPhone?: string;
}

const FEEDBACK_STATUSES = ['pending', 'processing', 'resolved'] as const;

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly dingtalkAlert?: DingtalkAlertService,
    @Optional() private readonly wechatAlert?: WechatOfficialAlertService,
  ) {}

  async create(input: CreateFeedbackInput) {
    const title = (input.title ?? '').trim();
    const content = (input.content ?? '').trim();
    if (!title || !content)
      throw new BadRequestException('请填写反馈标题和内容');
    if (title.length > 50 || content.length > 500)
      throw new BadRequestException('反馈内容超出长度限制');
    if (input.type?.trim() === '账号注销申请')
      throw new BadRequestException('请使用账号注销入口提交申请');

    const attachmentUrls = Array.isArray(input.attachmentUrls)
      ? input.attachmentUrls
          .filter((url): url is string => typeof url === 'string' && !!url.trim())
          .map((url) => url.trim())
          .slice(0, 6)
      : [];

    let sourceName: string | null = null;
    let sourcePhone: string | null = null;

    if (input.sourceType === 'client') {
      const user = await this.prisma.clientUser.findUnique({
        where: { id: input.sourceId },
        select: { nickname: true, phone: true },
      });
      sourceName = user?.nickname ?? null;
      sourcePhone = (input.contactPhone ?? '').trim() || user?.phone || null;
    } else {
      const tech = await this.prisma.technician.findUnique({
        where: { id: input.sourceId },
        select: { name: true, phone: true },
      });
      sourceName = tech?.name ?? null;
      sourcePhone = (input.contactPhone ?? '').trim() || tech?.phone || null;
    }

    const type = (input.type ?? '其他').trim() || '其他';
    const created = await this.prisma.feedback.create({
      data: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceName,
        sourcePhone,
        title,
        type,
        content,
        attachmentUrls: JSON.stringify(attachmentUrls),
      },
    });

    const alertPayload = {
      id: created.id,
      sourceType: input.sourceType,
      sourceName,
      sourcePhone,
      type,
      title,
      content,
      attachmentCount: attachmentUrls.length,
    };

    // 异步触发钉钉机器人通知
    if (this.dingtalkAlert) {
      const roleLabel = input.sourceType === 'technician' ? '美甲师' : '客户';
      const isCs = type === '客服咨询';
      const timeStr = new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      });
      const dingtalkMarkdown = [
        isCs
          ? '### 💬 OnlyNail 客服新问询提醒'
          : '### 🛠️ OnlyNail 收到新问题反馈',
        `• **反馈编号**：#${created.id}`,
        `• **提交身份**：${roleLabel}${sourceName ? ` (${sourceName})` : ''}`,
        `• **联系方式**：${sourcePhone || '未填写'}`,
        `• **问题类型**：${type}`,
        `• **标题**：${title}`,
        attachmentUrls.length
          ? `• **问题截图**：${attachmentUrls.length} 张（可在超管后台查看原图）`
          : '',
        `• **提交时间**：${timeStr}`,
        '• **详细内容**：',
        `> ${content.replace(/\n/g, '\n> ')}`,
        '',
        '*已同步保存至超管后台「客服与反馈」，请及时回复处理。*',
      ]
        .filter(Boolean)
        .join('\n');
      this.dingtalkAlert
        .sendMarkdown(
          isCs ? 'OnlyNail 收到客服新问询' : 'OnlyNail 收到新问题反馈',
          dingtalkMarkdown,
        )
        .catch((err) => {
          this.logger.error(`推送问题反馈到钉钉失败: ${String(err)}`);
        });
    }

    // 异步触发微信公众号通知管理员
    if (this.wechatAlert) {
      this.wechatAlert
        .notifyFeedbackSubmission(alertPayload)
        .catch((err) => {
          this.logger.error(`推送问题反馈到微信公众号失败: ${String(err)}`);
        });
    }

    return this.serialize(created);
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    sourceType?: string;
    type?: string;
    keyword?: string;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.sourceType) where.sourceType = params.sourceType;
    if (params.type) {
      if (params.type === '__feedback_only__') {
        where.type = { not: '客服咨询' };
      } else {
        where.type = params.type;
      }
    }
    const keyword = (params.keyword ?? '').trim();
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
        { sourceName: { contains: keyword } },
        { sourcePhone: { contains: keyword } },
      ];
    }

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
      list: list.map((item) => this.serialize(item)),
      total,
      page,
      pageSize,
    };
  }

  async findMine(sourceType: 'client' | 'technician', sourceId: number) {
    const [list, unreadCount] = await Promise.all([
      this.prisma.feedback.findMany({
        where: { sourceType, sourceId },
        orderBy: { createdAt: 'desc' },
      }),
      this.countUnreadReplies(sourceType, sourceId),
    ]);
    return { list: list.map((item) => this.serialize(item)), unreadCount };
  }

  async countUnreadReplies(sourceType: 'client' | 'technician', sourceId: number) {
    return this.prisma.feedback.count({
      where: {
        sourceType,
        sourceId,
        replyContent: { not: null },
        replyReadAt: null,
      },
    });
  }

  async markAllRepliesRead(sourceType: 'client' | 'technician', sourceId: number) {
    const result = await this.prisma.feedback.updateMany({
      where: {
        sourceType,
        sourceId,
        replyContent: { not: null },
        replyReadAt: null,
      },
      data: { replyReadAt: new Date() },
    });
    return { markedCount: result.count };
  }

  async findMineById(
    id: number,
    sourceType: 'client' | 'technician',
    sourceId: number,
  ) {
    let item = await this.prisma.feedback.findFirst({
      where: { id, sourceType, sourceId },
    });
    if (!item) throw new NotFoundException('反馈不存在');
    if (item.replyContent && !item.replyReadAt) {
      item = await this.prisma.feedback.update({
        where: { id: item.id },
        data: { replyReadAt: new Date() },
      });
    }
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
        replyReadAt: replyContent ? null : found.replyReadAt,
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
