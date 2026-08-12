import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RewardFundService } from './reward-fund.service';
import { confirmedPaidAmount, isFullyPaid } from '../orders/order-accounting';

const REFERRAL_REWARD_RATE = 0.05;

function calculateRewardAmount(paidAmount: number) {
  return Math.round(paidAmount * REFERRAL_REWARD_RATE * 100) / 100;
}

type CompletedOrder = {
  id: number;
  clientUserId: number | null;
  technicianId: number;
  quotePrice: number | null;
  fundDiscountAmount?: number | null;
  paidAmount?: number | null;
  paymentStatus?: string | null;
};

@Injectable()
export class ReferralQualificationService {
  constructor(private readonly rewardFunds: RewardFundService) {}

  async qualifyCompletedOrder(
    tx: Prisma.TransactionClient,
    order: CompletedOrder,
  ) {
    if (!order.clientUserId) return null;
    const relation = await tx.referralRelation.findUnique({
      where: {
        technicianId_referredClientId: {
          technicianId: order.technicianId,
          referredClientId: order.clientUserId,
        },
      },
      include: { qualification: true },
    });
    if (!relation || relation.qualification || !relation.rewardPromised) {
      if (relation?.qualification) {
        await this.rewardFunds.issueReferralReward(tx, {
          qualificationId: relation.qualification.id,
          technicianId: relation.technicianId,
          referrerClientId: relation.referrerClientId,
          rewardAmount: relation.qualification.rewardAmount,
        });
      }
      return relation?.qualification ?? null;
    }

    if (!isFullyPaid(order)) return null;
    const paidAmount = confirmedPaidAmount(order);
    if (paidAmount < relation.minimumOrderAmount) return null;
    const rewardAmount = calculateRewardAmount(paidAmount);
    if (rewardAmount <= 0) return null;

    const qualification = await tx.referralQualification.upsert({
      where: { relationId: relation.id },
      create: {
        relationId: relation.id,
        orderId: order.id,
        paidAmount,
        minimumOrderAmount: relation.minimumOrderAmount,
        rewardAmount,
      },
      update: {},
    });
    await tx.referralRelation.update({
      where: { id: relation.id },
      data: { status: 'qualified' },
    });
    await this.rewardFunds.issueReferralReward(tx, {
      qualificationId: qualification.id,
      technicianId: relation.technicianId,
      referrerClientId: relation.referrerClientId,
      rewardAmount: qualification.rewardAmount,
    });
    return qualification;
  }
}
