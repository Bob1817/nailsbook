import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { PushService } from '../notifications/push.service';
import * as crypto from 'crypto';
import { ReferralQualificationService } from '../referrals/referral-qualification.service';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
    private push: PushService,
    @Optional()
    private readonly referralQualification?: ReferralQualificationService,
  ) {}

  // 批处理大小，避免单次 findMany 全表扫描导致 CPU 飙高
  private static readonly BATCH_SIZE = 100;

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleOrderStatusTransitions() {
    const now = new Date();
    this.logger.log(`[${now.toISOString()}] 开始检查订单状态自动转换`);

    await this.autoTransitionToExpired(now);
    await this.autoTransitionToInProgress(now);
    await this.autoTransitionToCompleted(now);
    // sendDayBeforeReminders 有独立的 @Cron('0 20 * * *') 每天 20 点执行，
    // 不应在这个每 5 分钟的任务中重复调用（导致每天 289 次而非预期的 1 次）
    await this.sendHourBeforeReminders(now);

    this.logger.log(`[${now.toISOString()}] 订单状态自动转换检查完成`);
  }

  // 每天 20:00 提醒次日的预约
  @Cron('0 20 * * *')
  async sendDayBeforeReminders(now: Date = new Date()) {
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
      take: OrdersScheduler.BATCH_SIZE,
      orderBy: { id: 'asc' },
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
      const scheduledFor = new Date(order.startTime);
      scheduledFor.setDate(scheduledFor.getDate() - 1);
      scheduledFor.setHours(20, 0, 0, 0);
      await this.processReminder(order, 'day_before', preview, scheduledFor);
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
      take: OrdersScheduler.BATCH_SIZE,
      orderBy: { id: 'asc' },
    });

    if (orders.length === 0) return;

    this.logger.log(`发送 ${orders.length} 条 1 小时预约提醒`);

    for (const order of orders) {
      const preview = '预约即将开始（约 1 小时后），请做好准备～';
      const scheduledFor = new Date(
        new Date(order.startTime).getTime() - 60 * 60 * 1000,
      );
      await this.processReminder(
        order,
        'hour_before',
        preview,
        scheduledFor,
      );
    }
  }

  private async processReminder(
    order: any,
    type: 'day_before' | 'hour_before',
    preview: string,
    scheduledFor: Date,
  ) {
    const reminder = await this.prisma.orderReminder.upsert({
      where: { orderId_type: { orderId: order.id, type } },
      create: {
        orderId: order.id,
        type,
        scheduledFor,
      },
      update: { scheduledFor },
    });
    if (reminder.status === 'sent' || reminder.status === 'cancelled') return;

    const claimed = await this.prisma.orderReminder.updateMany({
      where: {
        id: reminder.id,
        status: { in: ['pending', 'failed'] },
        attempts: { lt: 3 },
      },
      data: {
        status: 'sending',
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        lastError: null,
      },
    });
    if (claimed.count === 0) return;

    try {
      await this.broadcastOrderReminder(order, reminder.id, type, preview);
    } catch (error) {
      await this.prisma.orderReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'failed',
          lastError: (error as Error).message.slice(0, 500),
        },
      });
      this.logger.error(
        `订单 #${order.id} ${type} 提醒发送失败: ${(error as Error).message}`,
      );
    }
  }

  private async broadcastOrderReminder(
    order: any,
    reminderId: number,
    type: 'day_before' | 'hour_before',
    preview: string,
  ) {
    if (!order.clientUserId) {
      await this.prisma.$transaction([
        this.prisma.orderReminder.update({
          where: { id: reminderId },
          data: { status: 'sent', sentAt: new Date() },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data:
            type === 'day_before'
              ? { reminderDaySent: true }
              : { reminderHourSent: true },
        }),
      ]);
      await this.push.sendToTechnician(order.technicianId, {
        title: '预约提醒',
        body: preview,
        data: { orderId: String(order.id), reminderType: type },
      });
      return;
    }

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

      await tx.orderReminder.update({
        where: { id: reminderId },
        data: { status: 'sent', sentAt: new Date() },
      });
      await tx.order.update({
        where: { id: order.id },
        data:
          type === 'day_before'
            ? { reminderDaySent: true }
            : { reminderHourSent: true },
      });
    });

    await Promise.all([
      this.push.sendToClient(order.clientUserId, {
        title: '预约提醒',
        body: preview,
        data: { orderId: String(order.id), reminderType: type },
      }),
      this.push.sendToTechnician(order.technicianId, {
        title: '预约提醒',
        body: preview,
        data: { orderId: String(order.id), reminderType: type },
      }),
    ]);

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
  }

  // 预约创建流程中（待报价/待确认等），若预约时间已过仍未进入行程
  // （待上门/待到店），则自动置为「已过期」，并释放占用的时间段。
  private async autoTransitionToExpired(now: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: {
          in: [
            'pending_quote',
            'pending_agree',
            'pending_confirm',
            'pending_client_confirm',
          ],
        },
        startTime: { lt: now },
      },
      take: OrdersScheduler.BATCH_SIZE,
      orderBy: { id: 'asc' },
    });

    if (orders.length === 0) return;

    this.logger.log(`发现 ${orders.length} 个预约需要自动置为 expired`);

    for (const order of orders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'expired',
              expiredAt: now,
              expiredFromStatus: order.status,
            },
          });
          // 释放冻结时段，避免过期预约长期占用美甲师档期
          await tx.blockedTimeSlot.deleteMany({ where: { orderId: order.id } });
        });

        // 系统自动操作（无人工操作者），客户与美甲师双方均通知
        await this.broadcastOrderExpired(order);

        this.logger.log(`预约 #${order.id} 自动从 ${order.status} 置为 expired`);
      } catch (error) {
        this.logger.error(
          `预约 #${order.id} 自动置为 expired 失败: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async broadcastOrderExpired(order: any) {
    if (!order.clientUserId) return;

    const preview = '预约已过期，可在预约详情重新发起～';
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
            .emit('message:new', { message: msg, conversation: updatedConv });
        }
      }
    } catch (e) {
      this.logger.error(
        `预约 #${order.id} 过期通知推送失败: ${(e as Error).message}`,
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
      take: OrdersScheduler.BATCH_SIZE,
      orderBy: { id: 'asc' },
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
      take: OrdersScheduler.BATCH_SIZE,
      orderBy: { id: 'asc' },
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
                amount: Math.max(
                  0,
                  (order.quotePrice ?? 0) - (order.fundDiscountAmount ?? 0),
                ),
                recognizedAt: new Date(),
                status: 'confirmed',
              },
            });
          }

          if (this.referralQualification) {
            await this.referralQualification.qualifyCompletedOrder(tx, order);
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
