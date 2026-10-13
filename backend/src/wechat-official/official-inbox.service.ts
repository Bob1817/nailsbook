import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { describeWechatError } from './official-error-hint';
import { OfficialAccessTokenService } from './official-access-token.service';
import type { WechatXmlMessage } from './official-xml.util';
import { WechatOfficialConfigService } from './wechat-official-config.service';

/** pending=待人工处理；auto_replied=已自动回复；handled=已人工处理；note=仅记录。 */
export type InboxStatus = 'pending' | 'auto_replied' | 'handled' | 'note';

/** 客服消息文本上限 2048 字节，按字符保守截断。 */
const MAX_REPLY_LENGTH = 600;

/** 需要人工关注的媒体消息类型。 */
const MEDIA_MESSAGE_TYPES = new Set([
  'image',
  'voice',
  'video',
  'shortvideo',
  'location',
  'link',
]);

@Injectable()
export class OfficialInboxService {
  private readonly logger = new Logger(OfficialInboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly officialConfig: WechatOfficialConfigService,
    private readonly accessToken: OfficialAccessTokenService,
  ) {}

  /**
   * 记录一条用户发来的消息。
   *
   * 用微信 MsgId 做唯一约束去重（微信 5 秒未收到响应会重试 3 次），
   * 因此重复推送不会产生重复记录。记录失败不影响自动回复流程。
   */
  async recordIncoming(
    message: WechatXmlMessage,
    status: InboxStatus,
  ): Promise<void> {
    const openId = message.FromUserName;
    if (!openId) {
      return;
    }
    const appId = await this.resolveAppId();
    if (!appId) {
      return;
    }
    const msgType = message.MsgType || 'unknown';
    const data = {
      appId,
      openId,
      direction: 'in',
      msgType,
      content: this.extractContent(message, msgType),
      mediaId: message.MediaId ?? null,
      eventType: message.Event ? message.Event.toLowerCase() : null,
      eventKey: message.EventKey ?? null,
      wechatMsgId: message.MsgId ?? null,
      status,
    };

    try {
      await this.prisma.wechatOfficialMessage.create({ data });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        this.logger.log(`重复消息已忽略：${message.MsgId ?? ''}`);
        return;
      }
      this.logger.warn(`记录公众号消息失败：${String(error)}`);
    }
  }

  /** 管理端列表：默认按时间倒序，可只看待人工处理。 */
  async listMessages(input: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Math.trunc(input.page ?? 1) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Math.trunc(input.pageSize ?? 20) || 20),
    );
    const where =
      input.status && input.status !== 'all' ? { status: input.status } : {};

    const [items, total, pendingCount] = await this.prisma.$transaction([
      this.prisma.wechatOfficialMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.wechatOfficialMessage.count({ where }),
      this.prisma.wechatOfficialMessage.count({ where: { status: 'pending' } }),
    ]);

    return {
      items: items.map((item) => this.toView(item)),
      total,
      page,
      pageSize,
      pendingCount,
    };
  }

  /** 单个用户的会话线程（按时间正序），附带是否已关联小程序身份。 */
  async getThread(openId: string, limit = 80) {
    if (!openId) {
      throw new BadRequestException('缺少 openId');
    }
    const size = Math.min(200, Math.max(1, Math.trunc(limit) || 80));
    const [items, identity] = await Promise.all([
      this.prisma.wechatOfficialMessage.findMany({
        where: { openId },
        orderBy: { createdAt: 'desc' },
        take: size,
      }),
      this.prisma.wechatIdentity
        .findFirst({
          where: { openId },
          select: { unionId: true, clientUserId: true, technicianId: true },
        })
        .catch(() => null),
    ]);

    return {
      openId,
      linkedToMiniProgram: !!(identity?.unionId),
      linkedClientUserId: identity?.clientUserId ?? null,
      items: items.reverse().map((item) => this.toView(item)),
    };
  }

  /** 标记单条消息为已处理。 */
  async markHandled(id: number, operator?: string) {
    const target = await this.prisma.wechatOfficialMessage.findUnique({
      where: { id },
    });
    if (!target) {
      throw new BadRequestException('消息不存在');
    }
    await this.prisma.wechatOfficialMessage.update({
      where: { id },
      data: { status: 'handled', handledAt: new Date(), repliedBy: operator },
    });
    return { ok: true };
  }

  /**
   * 管理端人工回复（客服消息接口）。
   *
   * 注意：微信限制用户与公众号最后一次互动后 48 小时内才能下发客服消息，
   * 超出窗口会返回 45015，这里翻译成可照做的提示。
   */
  async replyToUser(input: {
    openId: string;
    content: string;
    operator?: string;
  }) {
    const content = (input.content ?? '').trim();
    if (!content) {
      throw new BadRequestException('回复内容不能为空');
    }
    if (content.length > MAX_REPLY_LENGTH) {
      throw new BadRequestException(
        `回复内容过长，请控制在 ${MAX_REPLY_LENGTH} 字以内`,
      );
    }

    const config = await this.officialConfig.requireResolvedConfig();
    const token = await this.accessToken.getAccessTokenFor(
      config.appId,
      config.appSecret,
    );

    let payload: { errcode?: number; errmsg?: string };
    try {
      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touser: input.openId,
            msgtype: 'text',
            text: { content },
          }),
        },
      );
      payload = (await response.json()) as {
        errcode?: number;
        errmsg?: string;
      };
    } catch (error) {
      this.logger.error(`发送客服消息失败：${String(error)}`);
      throw new BadRequestException('发送失败：无法连接微信接口，请稍后重试');
    }

    if (payload.errcode) {
      const hint = describeWechatError(payload.errcode, payload.errmsg);
      this.logger.warn(`客服消息被拒绝：${payload.errcode} ${payload.errmsg}`);
      throw new BadRequestException(hint);
    }

    await this.prisma.$transaction([
      this.prisma.wechatOfficialMessage.create({
        data: {
          appId: config.appId,
          openId: input.openId,
          direction: 'out',
          msgType: 'text',
          content,
          status: 'handled',
          replyMode: 'manual',
          repliedBy: input.operator ?? null,
          handledAt: new Date(),
        },
      }),
      this.prisma.wechatOfficialMessage.updateMany({
        where: { openId: input.openId, status: 'pending' },
        data: { status: 'handled', handledAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  private extractContent(message: WechatXmlMessage, msgType: string) {
    if (msgType === 'text') {
      return message.Content ?? '';
    }
    if (MEDIA_MESSAGE_TYPES.has(msgType)) {
      // 媒体类消息无法在后台直接查看，用占位文案让处理人知道用户发了什么。
      return `[${msgType}]`;
    }
    return message.Content ?? '';
  }

  private toView(item: {
    id: number;
    openId: string;
    direction: string;
    msgType: string;
    content: string;
    status: string;
    eventType: string | null;
    eventKey: string | null;
    replyMode: string | null;
    repliedBy: string | null;
    handledAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: item.id,
      openId: item.openId,
      direction: item.direction,
      msgType: item.msgType,
      content: item.content,
      status: item.status,
      eventType: item.eventType,
      eventKey: item.eventKey,
      replyMode: item.replyMode,
      repliedBy: item.repliedBy,
      handledAt: item.handledAt ? item.handledAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private async resolveAppId(): Promise<string | null> {
    try {
      const config = await this.officialConfig.requireResolvedConfig();
      return config.appId;
    } catch (error) {
      this.logger.warn(`公众号未配置，消息不落库：${String(error)}`);
      return null;
    }
  }
}
