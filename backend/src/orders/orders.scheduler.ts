import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import * as crypto from 'crypto';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleOrderStatusTransitions() {
    const now = new Date();
    this.logger.log(`[${now.toISOString()}] 开始检查订单状态自动转换`);

    await this.autoTransitionToInProgress(now);
    await this.autoTransitionToCompleted(now);
    await this.sendHourBeforeReminders(now);

    this.logger.log(`[${now.toISOString()}] 订单状态自动转换检查完成`);
  }

  // 每天 20:00 提醒次日的预约
  @Cron('0 20 * * *')
  async sendDayBeforeReminders() {
    const now = new Date();
    this.logger.log(`[${now.toISOString()}] 开始检查次日预约提醒`);

    // 明天 0:00 - 明天 23:59:59 之间的预约
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ['pending_home', 'pending_shop'] },
        startTime: { gte: tomorrowStart, lte: tomorrowEnd },
        reminderDaySent: false,
      },
    });

    if (orders.length === 0) {
      this.logger.log('无需发送次日预约提醒');
      return;
    }

    this.logger.log(`发送 ${orders.length} 条次日预约提醒`);

    for (const order of orders) {
      const time = new Date(order.startTime);
      const hh = String(time.getHours()).padStart(2, '0');
      const mm = String(time.getMinutes()).padStart(2, '0');
      const preview = `温馨提醒：明天 ${hh}:${mm} 有一个预约，请提前做好准备～`;
      await this.broadcastOrderReminder(order, preview);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { reminderDaySent: true },
      });
    }
  }

  private async sendHourBeforeReminders(now: Date) {
    // 距离开始时间在 60-65 分钟之间（兼容 5 分钟扫描间隔的容忍窗口）
    const upper = new Date(now.getTime() + 65 * 60 * 1000);
    const lower = new Date(now.getTime() + 55 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ['pending_home', 'pending_shop'] },
        startTime: { gte: lower, lte: upper },
        reminderHourSent: false,
      },
    });

    if (orders.length === 0) return;

    this.logger.log(`发送 ${orders.length} 条 1 小时预约提醒`);

    for (const order of orders) {
      const preview = '预约即将开始（约 1 小时后），请做好准备～';
      await this.broadcastOrderReminder(order, preview);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { reminderHourSent: true },
      });
    }
  }

  private async broadcastOrderReminder(order: any, preview: string) {
    if (!order.clientUserId) return;

    try {
      let conversationId: number | null = null;
      const messages: any[] = [];

      await this.prisma.$transaction(async (tx) => {
        const conversation = await tx.conversation.upsert({
          where: {
            clientId_techId: {
              clientId: order.clientUserId,
              techId: order.technicianId,
            },
          },
          update: { lastMessage: preview, lastMessageAt: new Date() },
          create: {
            clientId: order.clientUserId,
            techId: order.technicianId,
            lastMessage: preview,
            lastMessageAt: new Date(),
          },
        });
        conversationId = conversation.id;

        const msgClient = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'client',
            receiverId: order.clientUserId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
        const msgTech = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderType: 'system',
            senderId: 0,
            receiverType: 'technician',
            receiverId: order.technicianId,
            messageType: 'system',
            content: preview,
            relatedType: 'order',
            relatedId: order.id,
          },
        });
        messages.push(msgClient, msgTech);
      });

      if (conversationId && messages.length > 0) {
        const updatedConv = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        for (const msg of messages) {
          this.chatGateway.server
            .to(`conversation:${String(conversationId)}`)
            .emit('message:new', {
              message: msg,
              conversation: updatedConv,
            });
        }
      }
    } catch (e) {
      this.logger.error(
        `订单 #${order.id} 提醒消息推送失败: ${(e as Error).message}`,
      );
    }
  }

  private async autoTransitionToInProgress(now: Date) {
    const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ['pending_home', 'pending_shop'] },
        startTime: { lte: thirtyMinLater },
      },
    });

    if (orders.length === 0) return;

    this.logger.log(`发现 ${orders.length} 个订单需要自动转换为 in_progress`);

    for (const order of orders) {
      try {
        let systemMessages: any[] = [];
        let conversationId: number | null = null;

        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'in_progress' },
          });

          if (order.clientUserId) {
            const preview = '订单即将开始，请做好准备～';
            const conversation = await tx.conversation.upsert({
              where: {
                clientId_techId: {
                  clientId: order.clientUserId,
                  techId: order.technicianId,
                },
              },
              update: { lastMessage: preview, lastMessageAt: new Date() },
              create: {
                clientId: order.clientUserId,
                techId: order.technicianId,
                lastMessage: preview,
                lastMessageAt: new Date(),
              },
            });

            conversationId = conversation.id;

            const msg1 = await tx.message.create({
              data: {
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 0,
                receiverType: 'client',
                receiverId: order.clientUserId,
                messageType: 'system',
                content: preview,
                relatedType: 'order',
                relatedId: order.id,
              },
            });

            const msg2 = await tx.message.create({
              data: {
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 0,
                receiverType: 'technician',
                receiverId: order.technicianId,
                messageType: 'system',
                content: preview,
                relatedType: 'order',
                relatedId: order.id,
              },
            });

            systemMessages = [msg1, msg2];
          }
        });

        if (systemMessages.length > 0 && conversationId) {
          try {
            const updatedConversation =
              await this.prisma.conversation.findUnique({
                where: { id: conversationId },
              });
            for (const msg of systemMessages) {
              this.chatGateway.server
                .to(`conversation:${String(conversationId)}`)
                .emit('message:new', {
                  message: msg,
                  conversation: updatedConversation,
                });
            }
          } catch (e) {
            this.logger.error(
              `[OrdersScheduler] Failed to push notification via WebSocket for order #${order.id}:`,
              e,
            );
          }
        }

        this.logger.log(
          `订单 #${order.id} 自动从 ${order.status} 转换为 in_progress`,
        );
      } catch (error) {
        this.logger.error(
          `订单 #${order.id} 自动转换为 in_progress 失败: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async autoTransitionToCompleted(now: Date) {
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'in_progress',
        endTime: { lte: twentyFourHoursAgo },
      },
    });

    if (orders.length === 0) return;

    this.logger.log(`发现 ${orders.length} 个订单需要自动转换为 completed`);

    for (const order of orders) {
      try {
        const revenueExists = await this.prisma.revenue.findUnique({
          where: { orderId: order.id },
        });

        let systemMessage: any = null;
        let conversationId: number | null = null;

        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'completed', completedAt: new Date() },
          });

          if (!revenueExists) {
            await tx.revenue.create({
              data: {
                revenueNo: `RV${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
                orderId: order.id,
                technicianId: order.technicianId,
                customerId: order.customerId,
                amount: order.quotePrice ?? 0,
                recognizedAt: new Date(),
                status: 'confirmed',
              },
            });
          }

          if (order.clientUserId) {
            const preview = '服务已完成，感谢使用～';
            const conversation = await tx.conversation.upsert({
              where: {
                clientId_techId: {
                  clientId: order.clientUserId,
                  techId: order.technicianId,
                },
              },
              update: { lastMessage: preview, lastMessageAt: new Date() },
              create: {
                clientId: order.clientUserId,
                techId: order.technicianId,
                lastMessage: preview,
                lastMessageAt: new Date(),
              },
            });

            conversationId = conversation.id;

            systemMessage = await tx.message.create({
              data: {
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 0,
                receiverType: 'client',
                receiverId: order.clientUserId,
                messageType: 'system',
                content: preview,
                relatedType: 'order',
                relatedId: order.id,
              },
            });
          }
        });

        if (systemMessage && conversationId) {
          try {
            const updatedConversation =
              await this.prisma.conversation.findUnique({
                where: { id: conversationId },
              });
            this.chatGateway.server
              .to(`conversation:${String(conversationId)}`)
              .emit('message:new', {
                message: systemMessage,
                conversation: updatedConversation,
              });
          } catch (e) {
            this.logger.error(
              `[OrdersScheduler] Failed to push notification via WebSocket for order #${order.id}:`,
              e,
            );
          }
        }

        this.logger.log(
          `订单 #${order.id} 自动从 in_progress 转换为 completed`,
        );
      } catch (error) {
        this.logger.error(
          `订单 #${order.id} 自动转换为 completed 失败: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
