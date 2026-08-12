import {
  BadRequestException,
  ConflictException,
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
  ) {}

  async createOrderPayment(
    clientUserId: number,
    orderId: number,
    paymentType: OrderPaymentType,
    idempotencyKey: string,
  ) {
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
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
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
      if (!['in_progress', 'completed'].includes(order.status)) {
        throw new BadRequestException('服务开始或完成后才能支付尾款');
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

  async confirmPaid(paymentNo: string, providerTradeNo: string) {
    const payment = await this.prisma.paymentOrder.findUnique({
      where: { paymentNo },
    });
    if (!payment) throw new NotFoundException('支付单不存在');
    if (payment.status === 'paid') return this.mapPayment(payment);
    if (payment.status !== 'pending') {
      throw new BadRequestException('当前支付单不能确认成功');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();
      const claimed = await tx.paymentOrder.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { status: 'paid', providerTradeNo, paidAt, failureReason: null },
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
                }
              : {}),
          },
        });
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
      return tx.paymentOrder.findUniqueOrThrow({ where: { id: payment.id } });
    });
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
    await this.confirmPaid(payment.paymentNo, transaction.transaction_id);
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
