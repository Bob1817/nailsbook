import { ChatGateway } from '../chat/chat.gateway';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';
import { Optional } from '@nestjs/common';
import { ReferralQualificationService } from '../referrals/referral-qualification.service';
import { revenueSnapshot } from '../orders/order-accounting';
import { WechatPlatformConfigService } from '../wechat-platform-config/wechat-platform-config.service';
import { WechatPayService } from './wechat-pay.service';
import { WechatAuthService } from '../wechat-auth/wechat-auth.service';
import {
  assertMiniProgramFeatureDisabled,
  isMiniProgramLaunchMode,
} from '../common/miniprogram-launch-mode';
import {
  calculateSubscriptionExpiry,
  calculateUpgradeProration,
  isPlanCurrentlyEffective,
  resolvePlanPricing,
} from '../subscriptions/subscription-pricing.util';

export type OrderPaymentType = 'deposit' | 'final';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional()
    private readonly referralQualification?: ReferralQualificationService,
    @Optional()
    private readonly platformConfig?: WechatPlatformConfigService,
    @Optional()
    private readonly wechatPay?: WechatPayService,
    @Optional() private readonly chatGateway?: ChatGateway,
    @Optional() private readonly wechatAuth?: WechatAuthService,
  ) {}

  async createOrderPayment(
    clientUserId: number,
    orderId: number,
    paymentType: OrderPaymentType,
    idempotencyKey: string,
  ) {
    if (isMiniProgramLaunchMode()) {
      assertMiniProgramFeatureDisabled('在线支付');
    }
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey) throw new BadRequestException('缺少支付幂等键');
    if (!['deposit', 'final'].includes(paymentType)) {
      throw new BadRequestException('支付阶段无效');
    }
    const existing = await this.prisma.paymentOrder.findUnique({
      where: { idempotencyKey: normalizedKey },
    });
    if (existing) {
      if (
        existing.clientUserId !== clientUserId ||
        existing.orderId !== orderId
      ) {
        throw new ConflictException('支付幂等键已被其他业务使用');
      }
      return this.mapPayment(existing);
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientUserId },
      select: {
        id: true,
        technicianId: true,
        status: true,
        quotePrice: true,
        fundDiscountAmount: true,
        depositAmount: true,
        tradeOrder: { select: { id: true, status: true } },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (!order.tradeOrder || order.tradeOrder.status === 'cancelled') {
      throw new BadRequestException('预约尚未生成可支付订单');
    }
    if (!order.quotePrice || order.quotePrice <= 0) {
      throw new BadRequestException('订单尚未完成报价');
    }

    const totalCents = this.toCents(
      Math.max(0, order.quotePrice - order.fundDiscountAmount),
    );
    const paid = await this.prisma.paymentOrder.aggregate({
      where: { orderId, status: 'paid' },
      _sum: { amountCents: true },
    });
    const paidCents = paid._sum.amountCents ?? 0;
    let amountCents: number;
    if (paymentType === 'deposit') {
      if (
        !['pending_confirm', 'pending_home', 'pending_shop'].includes(
          order.status,
        )
      ) {
        throw new BadRequestException('当前订单状态不支持支付定金');
      }
      const depositTarget = Math.min(
        totalCents,
        this.toCents(order.depositAmount ?? 0),
      );
      const paidDeposit = await this.prisma.paymentOrder.aggregate({
        where: { orderId, paymentType: 'deposit', status: 'paid' },
        _sum: { amountCents: true },
      });
      amountCents = Math.max(
        0,
        depositTarget - (paidDeposit._sum.amountCents ?? 0),
      );
    } else {
      if (
        !['pending_home', 'pending_shop', 'in_progress', 'completed'].includes(
          order.status,
        )
      ) {
        throw new BadRequestException('定金支付后才能支付尾款');
      }
      amountCents = Math.max(0, totalCents - paidCents);
    }
    if (amountCents <= 0)
      throw new BadRequestException('当前阶段没有待支付金额');

    const mockEnabled = this.config.get('PAYMENT_PROVIDER') === 'mock';
    if (mockEnabled && this.config.get('NODE_ENV') === 'production') {
      throw new ServiceUnavailableException('生产环境禁止使用模拟支付通道');
    }
    if (!mockEnabled) {
      if (
        !this.platformConfig ||
        !(await this.platformConfig.isPaymentAvailable())
      ) {
        throw new ServiceUnavailableException('微信支付配置未完整校验或未启用');
      }
      if (!this.wechatPay) {
        throw new ServiceUnavailableException('微信支付服务不可用');
      }
    }
    const identity = mockEnabled
      ? null
      : await this.prisma.wechatIdentity.findFirst({
          where: {
            clientUserId,
            appId: (await this.platformConfig!.getPaymentCredentials()).appId,
          },
          select: { openId: true },
        });
    if (!mockEnabled && !identity) {
      throw new BadRequestException('请先使用微信登录后再发起支付');
    }
    const payment = await this.prisma.paymentOrder.create({
      data: {
        paymentNo: `PAY${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        orderId,
        clientUserId,
        technicianId: order.technicianId,
        paymentType,
        amountCents,
        channel: 'wechat',
        status: 'pending',
        idempotencyKey: normalizedKey,
        failureReason: null,
        providerPayload: mockEnabled ? JSON.stringify({ mock: true }) : null,
      },
    });
    if (mockEnabled) return this.mapPayment(payment);

    try {
      const providerPayload = await this.wechatPay!.createJsapiPayment({
        paymentNo: payment.paymentNo,
        amountCents,
        description: `美甲预约${paymentType === 'deposit' ? '定金' : '尾款'}`,
        openId: identity!.openId,
      });
      const ready = await this.prisma.paymentOrder.update({
        where: { id: payment.id },
        data: { providerPayload: JSON.stringify(providerPayload) },
      });
      return this.mapPayment(ready);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '微信支付下单失败';
      await this.markFailed(payment.id, message);
      throw error;
    }
  }

  async createSubscriptionPayment(
    technicianId: number,
    planCode: string,
    idempotencyKey?: string,
    wechatCode?: string,
  ) {
    const normalizedPlanCode = String(planCode || '').trim().toLowerCase();
    if (!normalizedPlanCode) {
      throw new BadRequestException('请选择有效的套餐');
    }

    const normalizedKey = (
      idempotencyKey || `SUB_${technicianId}_${normalizedPlanCode}_${Date.now()}`
    ).trim();

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: normalizedPlanCode, status: 'active' },
    });
    if (!plan) throw new NotFoundException('套餐不存在');
    const now = new Date();
    if (!isPlanCurrentlyEffective({ ...plan, status: plan.status || 'active' }, now)) {
      throw new BadRequestException('该套餐暂未生效或已过期');
    }
    const pricing = resolvePlanPricing(plan, now);
    if (pricing.effectivePrice <= 0) {
      throw new BadRequestException('免费套餐无需在线支付');
    }

    const existing = await this.prisma.paymentOrder.findUnique({
      where: { idempotencyKey: normalizedKey },
    });
    if (existing) {
      if (existing.technicianId !== technicianId) {
        throw new ConflictException('支付幂等键已被其他美甲师使用');
      }
      return this.mapPayment(existing);
    }

    const currentSub = await this.prisma.technicianSubscription.findUnique({
      where: { technicianId },
      include: { plan: true },
    });
    const proration = calculateUpgradeProration(currentSub, plan, now);
    const amountCents = proration.payableCents;

    if (amountCents === 0) {
      const zeroPaymentNo = `SUB${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const zeroExpiredAt = calculateSubscriptionExpiry(plan.billingCycle, now);
      const paidOrder = await this.prisma.$transaction(async (tx) => {
        const order = await tx.paymentOrder.create({
          data: {
            paymentNo: zeroPaymentNo,
            subscriptionId: currentSub?.id ?? null,
            technicianId,
            paymentType: 'subscription',
            amountCents: 0,
            channel: 'wechat',
            status: 'paid',
            paidAt: now,
            providerTradeNo: `PRORATION_${zeroPaymentNo}`,
            idempotencyKey: normalizedKey,
            failureReason: null,
            providerPayload: JSON.stringify({
              targetPlanCode: plan.code,
              targetPlanId: plan.id,
              deductionCents: proration.deductionCents,
              effectivePriceCents: pricing.effectivePriceCents,
              zeroPayUpgraded: true,
            }),
          },
        });
        await tx.technicianSubscription.upsert({
          where: { technicianId },
          create: {
            technicianId,
            planId: plan.id,
            status: 'active',
            startedAt: now,
            expiredAt: zeroExpiredAt,
            lastPaidAmountCents: proration.deductionCents,
          },
          update: {
            planId: plan.id,
            status: 'active',
            startedAt: now,
            expiredAt: zeroExpiredAt,
            lastPaidAmountCents: proration.deductionCents,
            pendingPlanCode: null,
            changeEffectiveAt: null,
            cancelledAt: null,
          },
        });
        await tx.subscriptionChange.create({
          data: {
            technicianId,
            fromPlanCode: currentSub?.plan?.code ?? null,
            toPlanCode: plan.code,
            reason: 'proration_upgrade',
            effectiveAt: now,
          },
        });
        return order;
      });
      return {
        ...this.mapPayment(paidOrder),
        zeroPayUpgraded: true,
        paid: true,
        deductionAmount: proration.deductionAmount,
      };
    }
    const isProd = this.config.get('NODE_ENV') === 'production';
    const mockEnabled = this.config.get('PAYMENT_PROVIDER') === 'mock';
    if (mockEnabled && isProd) {
      throw new ServiceUnavailableException('生产环境禁止使用模拟支付通道');
    }
    if (!mockEnabled) {
      if (
        !this.platformConfig ||
        !(await this.platformConfig.isPaymentAvailable({
          allowInLaunchMode: true,
        }))
      ) {
        throw new ServiceUnavailableException(
          '微信支付尚未完成配置或未通过校验，请先在超管后台完成微信支付配置并校验生效',
        );
      }
      if (!this.wechatPay) {
        throw new ServiceUnavailableException('微信支付服务不可用');
      }
    }

    let openId: string | null = null;
    if (!mockEnabled) {
      const credentials = await this.platformConfig!.getPaymentCredentials({
        allowInLaunchMode: true,
      });

      // 优先使用小程序本次 wx.login() 实时换取的当前付款手机微信 openId，
      // 避免与账号历史绑定的微信号不一致触发微信「下单账号与支付账号不一致」拦截。
      if (wechatCode && this.wechatAuth) {
        try {
          if (typeof this.wechatAuth.resolveOpenIdByCode === 'function') {
            openId = await this.wechatAuth.resolveOpenIdByCode(wechatCode);
          } else {
            const session = await (this.wechatAuth as any).exchangeCode(
              wechatCode,
            );
            openId = session?.openid ?? null;
          }
        } catch (err) {
          console.warn('resolveOpenIdByCode for technician payment failed', err);
        }
      }

      // 仅当客户端未传 code 时，回退使用历史绑定 openId
      if (!openId) {
        const identity = await this.prisma.wechatIdentity.findFirst({
          where: { technicianId, appId: credentials.appId },
          select: { openId: true },
        });
        openId = identity?.openId ?? null;
      }

      if (!openId) {
        throw new BadRequestException('未获取到当前微信支付身份，请重新打开小程序后再试');
      }
    }

    const payment = await this.prisma.paymentOrder.create({
      data: {
        paymentNo: `SUB${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        subscriptionId: currentSub?.id ?? null,
        technicianId,
        paymentType: 'subscription',
        amountCents,
        channel: 'wechat',
        status: 'pending',
        idempotencyKey: normalizedKey,
        failureReason: null,
        providerPayload: JSON.stringify(
          mockEnabled
            ? {
                mock: true,
                targetPlanCode: plan.code,
                targetPlanId: plan.id,
                deductionCents: proration.deductionCents,
                effectivePriceCents: pricing.effectivePriceCents,
              }
            : {
                targetPlanCode: plan.code,
                targetPlanId: plan.id,
                deductionCents: proration.deductionCents,
                effectivePriceCents: pricing.effectivePriceCents,
              },
        ),
      },
    });

    if (mockEnabled) {
      return {
        ...this.mapPayment(payment),
        deductionAmount: proration.deductionAmount,
      };
    }

    try {
      const jsapiPayload = await this.wechatPay!.createJsapiPayment({
        paymentNo: payment.paymentNo,
        amountCents,
        description: `OnlyNail美甲师工作台-${plan.name}`,
        openId: openId!,
      });
      const providerPayload = {
        ...jsapiPayload,
        targetPlanCode: plan.code,
        targetPlanId: plan.id,
        deductionCents: proration.deductionCents,
        effectivePriceCents: pricing.effectivePriceCents,
      };
      const ready = await this.prisma.paymentOrder.update({
        where: { id: payment.id },
        data: { providerPayload: JSON.stringify(providerPayload) },
      });
      return {
        ...this.mapPayment(ready),
        deductionAmount: proration.deductionAmount,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '微信支付下单失败';
      await this.markFailed(payment.id, message);
      throw error;
    }
  }

  async confirmMockSubscriptionPayment(
    technicianId: number,
    paymentNo: string,
  ) {
    if (
      this.config.get('NODE_ENV') === 'production' ||
      this.config.get('PAYMENT_PROVIDER') !== 'mock'
    ) {
      throw new ForbiddenException('当前环境禁止调用模拟支付确认接口');
    }
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { paymentNo },
    });
    if (
      !payment ||
      payment.technicianId !== technicianId ||
      payment.paymentType !== 'subscription'
    ) {
      throw new NotFoundException('支付单不存在');
    }
    let payload: { mock?: boolean } | null = null;
    try {
      payload = payment.providerPayload
        ? JSON.parse(payment.providerPayload)
        : null;
    } catch {}
    if (!payload?.mock) {
      throw new ForbiddenException('真实支付订单不允许通过模拟接口确认');
    }
    return this.confirmPaid(paymentNo, `MOCK_TR_${Date.now()}`);
  }

  async getSubscriptionPaymentStatus(technicianId: number, paymentNo: string) {
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { paymentNo },
    });
    if (
      !payment ||
      payment.technicianId !== technicianId ||
      payment.paymentType !== 'subscription'
    ) {
      throw new NotFoundException('支付单不存在');
    }
    if (payment.status === 'paid') {
      return { payment: this.mapPayment(payment), paid: true };
    }

    let payload: { mock?: boolean } | null = null;
    try {
      payload = payment.providerPayload
        ? JSON.parse(payment.providerPayload)
        : null;
    } catch {}

    if (
      payment.status === 'pending' &&
      !payload?.mock &&
      this.wechatPay &&
      this.platformConfig
    ) {
      try {
        const transaction = await this.wechatPay.queryTransactionByOutTradeNo(
          payment.paymentNo,
        );
        if (
          transaction.trade_state === 'SUCCESS' &&
          transaction.transaction_id &&
          transaction.amount?.total === payment.amountCents
        ) {
          const confirmed = await this.confirmPaid(
            payment.paymentNo,
            transaction.transaction_id,
            transaction.amount?.payer_total ?? transaction.amount?.total,
          );
          return { payment: confirmed, paid: true };
        }
        if (
          transaction.trade_state &&
          ['CLOSED', 'REVOKED', 'PAYERROR'].includes(transaction.trade_state)
        ) {
          await this.markFailed(
            payment.id,
            transaction.trade_state_desc || `微信支付状态：${transaction.trade_state}`,
          );
          const failed = await this.prisma.paymentOrder.findUniqueOrThrow({
            where: { id: payment.id },
          });
          return { payment: this.mapPayment(failed), paid: false };
        }
      } catch {
        // 查单网络抖动时返回当前本地状态，交由客户端继续轮询或等待微信异步回调
      }
    }

    return {
      payment: this.mapPayment(payment),
      paid: payment.status === 'paid',
    };
  }

  async cancelSubscriptionPayment(
    technicianId: number,
    paymentNo: string,
    reason?: string,
  ) {
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { paymentNo },
    });
    if (
      !payment ||
      payment.technicianId !== technicianId ||
      payment.paymentType !== 'subscription'
    ) {
      throw new NotFoundException('支付单不存在');
    }
    if (payment.status !== 'pending') {
      return {
        payment: this.mapPayment(payment),
        cancelled: payment.status === 'cancelled',
      };
    }
    await this.prisma.paymentOrder.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: {
        status: 'cancelled',
        failureReason: (reason || '用户取消支付').slice(0, 240),
      },
    });
    const latest = await this.prisma.paymentOrder.findUniqueOrThrow({
      where: { id: payment.id },
    });
    return {
      payment: this.mapPayment(latest),
      cancelled: latest.status === 'cancelled',
    };
  }

  async listForOrder(clientUserId: number, orderId: number) {
    const owned = await this.prisma.order.findFirst({
      where: { id: orderId, clientUserId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('订单不存在');
    const payments = await this.prisma.paymentOrder.findMany({
      where: { orderId, clientUserId },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((item) => this.mapPayment(item));
  }

  async confirmPaid(
    paymentNo: string,
    providerTradeNo: string,
    paidAmountCents?: number,
  ) {
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { paymentNo },
    });
    if (!payment) throw new NotFoundException('支付单不存在');
    if (payment.status === 'paid') return this.mapPayment(payment);
    if (payment.status !== 'pending') {
      throw new BadRequestException('当前支付单不能确认成功');
    }

    const resolvedPaidCents =
      typeof paidAmountCents === 'number' &&
      Number.isFinite(paidAmountCents) &&
      paidAmountCents >= 0
        ? Math.round(paidAmountCents)
        : payment.amountCents;
    let nextProviderPayload = payment.providerPayload;
    try {
      const parsed = payment.providerPayload
        ? JSON.parse(payment.providerPayload)
        : {};
      if (parsed && typeof parsed === 'object') {
        parsed.paidAmountCents = resolvedPaidCents;
        nextProviderPayload = JSON.stringify(parsed);
      }
    } catch {}

    let changedBooking: { id: number; technicianId: number } | undefined;
    const updated = await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();
      const claimed = await tx.paymentOrder.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: {
          status: 'paid',
          providerTradeNo,
          paidAt,
          failureReason: null,
          ...(nextProviderPayload !== payment.providerPayload
            ? { providerPayload: nextProviderPayload }
            : {}),
        },
      });
      if (claimed.count !== 1) {
        return tx.paymentOrder.findUniqueOrThrow({ where: { id: payment.id } });
      }
      if (payment.orderId) {
        const order = await tx.order.findUniqueOrThrow({
          where: { id: payment.orderId },
        });
        const totals = await tx.paymentOrder.aggregate({
          where: { orderId: payment.orderId, status: 'paid' },
          _sum: { amountCents: true },
        });
        const paidAmount = (totals._sum.amountCents ?? 0) / 100;
        const payable = Math.max(
          0,
          (order.quotePrice ?? 0) - order.fundDiscountAmount,
        );
        const settledOrder = await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paidAmount,
            paymentStatus: paidAmount >= payable ? 'paid' : 'partial',
            paidAt: paidAmount >= payable ? paidAt : null,
            ...(payment.paymentType === 'deposit'
              ? {
                  isDepositPaid: true,
                  depositStatus: 'paid',
                  depositConfirmedAt: paidAt,
                  tradeStatus: 'deposit_paid',
                  status:
                    order.fulfillmentStatus ||
                    (order.serviceType === '上门美甲'
                      ? 'pending_home'
                      : 'pending_shop'),
                  bookingPhase: 'booking',
                }
              : {
                  tradeStatus:
                    paidAmount >= payable ? 'paid' : 'balance_pending',
                  ...(paidAmount >= payable && order.status === 'in_progress'
                    ? {
                        status: 'completed',
                        bookingPhase: 'finished',
                        completedAt: paidAt,
                      }
                    : {}),
                }),
          },
        });
        await tx.bookingTradeOrder.updateMany({
          where: { bookingId: order.id, status: { not: 'cancelled' } },
          data: {
            paidAmount,
            status: paidAmount >= payable ? 'completed' : 'pending',
            currentPayStage:
              payment.paymentType === 'deposit' && paidAmount < payable
                ? 'balance'
                : payment.paymentType,
            completedAt: paidAmount >= payable ? paidAt : null,
          },
        });
        if (order.clientUserId) {
          const content =
            payment.paymentType === 'deposit'
              ? '定金支付成功，预约已进入履约阶段'
              : '尾款支付成功，预约已完成';
          const conversation = await tx.conversation.upsert({
            where: {
              clientId_techId: {
                clientId: order.clientUserId,
                techId: order.technicianId,
              },
            },
            update: { lastMessage: content, lastMessageAt: paidAt },
            create: {
              clientId: order.clientUserId,
              techId: order.technicianId,
              lastMessage: content,
              lastMessageAt: paidAt,
            },
          });
          await tx.message.createMany({
            data: [
              {
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 0,
                receiverType: 'client',
                receiverId: order.clientUserId,
                messageType: 'system',
                content,
                relatedType: 'order',
                relatedId: order.id,
              },
              {
                conversationId: conversation.id,
                senderType: 'system',
                senderId: 0,
                receiverType: 'technician',
                receiverId: order.technicianId,
                messageType: 'system',
                content,
                relatedType: 'order',
                relatedId: order.id,
              },
            ],
          });
        }
        changedBooking = settledOrder;
        if (settledOrder.status === 'completed') {
          const accounting = revenueSnapshot(settledOrder);
          await tx.revenue.updateMany({
            where: { orderId: settledOrder.id },
            data: accounting,
          });
          if (this.referralQualification) {
            await this.referralQualification.qualifyCompletedOrder(
              tx,
              settledOrder,
            );
          }
        }
      }
      if (payment.paymentType === 'subscription' && payment.technicianId) {
        let payload: any = null;
        try {
          payload = payment.providerPayload
            ? JSON.parse(payment.providerPayload)
            : null;
        } catch {}
        const targetPlanCode = payload?.targetPlanCode;
        const targetPlanId = payload?.targetPlanId;
        const plan = targetPlanCode
          ? await tx.subscriptionPlan.findFirst({
              where: { code: targetPlanCode },
            })
          : targetPlanId
            ? await tx.subscriptionPlan.findUnique({
                where: { id: targetPlanId },
              })
            : payment.subscriptionId
              ? await tx.subscriptionPlan.findUnique({
                  where: { id: payment.subscriptionId },
                })
              : null;
        if (plan) {
          const currentSub = await tx.technicianSubscription.findUnique({
            where: { technicianId: payment.technicianId },
            include: { plan: true },
          });
          const now = new Date();
          const isRenewal = Boolean(
            currentSub &&
              currentSub.planId === plan.id &&
              currentSub.expiredAt &&
              currentSub.expiredAt > now,
          );
          const baseDate = isRenewal ? currentSub!.expiredAt! : now;
          const newExpiredAt = calculateSubscriptionExpiry(
            plan.billingCycle,
            baseDate,
          );
          const totalValueCents =
            resolvedPaidCents + (Number(payload?.deductionCents) || 0);

          await tx.technicianSubscription.upsert({
            where: { technicianId: payment.technicianId },
            create: {
              technicianId: payment.technicianId,
              planId: plan.id,
              status: 'active',
              startedAt: now,
              expiredAt: newExpiredAt,
              lastPaidAmountCents: totalValueCents,
            },
            update: {
              planId: plan.id,
              status: 'active',
              startedAt:
                isRenewal && currentSub?.status === 'active'
                  ? currentSub.startedAt
                  : now,
              expiredAt: newExpiredAt,
              lastPaidAmountCents: isRenewal
                ? (currentSub?.lastPaidAmountCents || 0) + totalValueCents
                : totalValueCents,
              pendingPlanCode: null,
              changeEffectiveAt: null,
              cancelledAt: null,
            },
          });

          await tx.subscriptionChange.create({
            data: {
              technicianId: payment.technicianId,
              fromPlanCode: currentSub?.plan?.code ?? null,
              toPlanCode: plan.code,
              reason: 'wechat_pay',
              effectiveAt: now,
            },
          });
        }
      }
      return tx.paymentOrder.findUniqueOrThrow({ where: { id: payment.id } });
    });
    if (changedBooking) this.chatGateway?.broadcastBookingChanged(changedBooking);
    return this.mapPayment(updated);
  }

  async handleWechatPaymentNotification(
    headers: Record<string, unknown>,
    rawBody: Buffer,
  ) {
    if (!this.wechatPay) {
      throw new ServiceUnavailableException('微信支付服务不可用');
    }
    const transaction = await this.wechatPay.parsePaymentNotification(
      headers,
      rawBody,
    );
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { paymentNo: transaction.out_trade_no },
    });
    if (!payment) throw new NotFoundException('支付单不存在');
    if (transaction.amount?.total !== payment.amountCents) {
      throw new BadRequestException('微信支付回调金额不匹配');
    }
    if (!transaction.transaction_id) {
      throw new BadRequestException('微信支付交易号缺失');
    }
    await this.confirmPaid(
      payment.paymentNo,
      transaction.transaction_id,
      transaction.amount?.payer_total ?? transaction.amount?.total,
    );
    return { code: 'SUCCESS', message: '成功' };
  }

  private async markFailed(id: number, reason: string) {
    await this.prisma.paymentOrder.update({
      where: { id },
      data: { status: 'failed', failureReason: reason.slice(0, 240) },
    });
  }

  private toCents(amount: number) {
    return Math.round(amount * 100);
  }

  private mapPayment(payment: any) {
    return {
      id: payment.id,
      paymentNo: payment.paymentNo,
      orderId: payment.orderId,
      subscriptionId: payment.subscriptionId,
      paymentType: payment.paymentType,
      amountCents: payment.amountCents,
      amount: payment.amountCents / 100,
      channel: payment.channel,
      status: payment.status,
      channelReady: payment.status !== 'channel_pending',
      unavailableReason: payment.failureReason || null,
      providerPayload: payment.providerPayload
        ? JSON.parse(payment.providerPayload)
        : null,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }
}
