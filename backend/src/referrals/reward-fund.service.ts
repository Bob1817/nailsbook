import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

type LedgerClient = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class RewardFundService {
  constructor(private readonly prisma: PrismaService) {}

  async issueReferralReward(
    tx: LedgerClient,
    input: {
      qualificationId: number;
      technicianId: number;
      referrerClientId: number;
      rewardAmount: number;
    },
  ) {
    const account = await tx.rewardAccount.upsert({
      where: {
        technicianId_clientUserId: {
          technicianId: input.technicianId,
          clientUserId: input.referrerClientId,
        },
      },
      create: {
        technicianId: input.technicianId,
        clientUserId: input.referrerClientId,
      },
      update: {},
    });
    return tx.rewardLedger.upsert({
      where: {
        sourceType_sourceId_entryType: {
          sourceType: 'referral_qualification',
          sourceId: String(input.qualificationId),
          entryType: 'referral_reward',
        },
      },
      create: {
        accountId: account.id,
        entryType: 'referral_reward',
        amount: input.rewardAmount,
        status: 'available',
        sourceType: 'referral_qualification',
        sourceId: String(input.qualificationId),
        availableAt: new Date(),
      },
      update: {},
    });
  }

  async redeemForOrder(
    tx: LedgerClient,
    input: {
      orderId: number;
      technicianId: number;
      clientUserId: number;
      quotePrice: number;
      amount: number;
    },
  ) {
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new BadRequestException('基金抵扣金额无效');
    }
    if (input.amount > input.quotePrice) {
      throw new BadRequestException('基金抵扣不能超过订单报价');
    }
    const existing = await tx.rewardLedger.findUnique({
      where: {
        sourceType_sourceId_entryType: {
          sourceType: 'order',
          sourceId: String(input.orderId),
          entryType: 'fund_redemption',
        },
      },
    });
    if (existing) {
      if (existing.amount !== -input.amount) {
        throw new ConflictException('该订单已使用不同金额的美甲基金');
      }
      return existing;
    }
    if (input.amount === 0) return null;

    const account = await tx.rewardAccount.findUnique({
      where: {
        technicianId_clientUserId: {
          technicianId: input.technicianId,
          clientUserId: input.clientUserId,
        },
      },
      include: { ledger: true },
    });
    const available = account ? this.availableBalance(account.ledger) : 0;
    if (!account || input.amount > available) {
      throw new BadRequestException('可用美甲基金余额不足');
    }
    return tx.rewardLedger.create({
      data: {
        accountId: account.id,
        entryType: 'fund_redemption',
        amount: -input.amount,
        status: 'used',
        sourceType: 'order',
        sourceId: String(input.orderId),
      },
    });
  }

  async reverseOrderRedemption(tx: LedgerClient, orderId: number) {
    const redemption = await tx.rewardLedger.findUnique({
      where: {
        sourceType_sourceId_entryType: {
          sourceType: 'order',
          sourceId: String(orderId),
          entryType: 'fund_redemption',
        },
      },
    });
    if (!redemption) return null;
    return tx.rewardLedger.upsert({
      where: {
        sourceType_sourceId_entryType: {
          sourceType: 'order',
          sourceId: String(orderId),
          entryType: 'fund_redemption_reversal',
        },
      },
      create: {
        accountId: redemption.accountId,
        entryType: 'fund_redemption_reversal',
        amount: Math.abs(redemption.amount),
        status: 'available',
        sourceType: 'order',
        sourceId: String(orderId),
        reversalOfId: redemption.id,
        availableAt: new Date(),
      },
      update: {},
    });
  }

  async getForClient(clientUserId: number) {
    const accounts = await this.prisma.rewardAccount.findMany({
      where: { clientUserId },
      include: {
        technician: { select: { id: true, name: true, avatarUrl: true } },
        ledger: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      totals: this.summarize(accounts.flatMap((account) => account.ledger)),
      accounts: accounts.map((account) => ({
        id: account.id,
        technician: account.technician,
        totals: this.summarize(account.ledger),
        ledger: account.ledger,
      })),
    };
  }

  async getForTechnician(technicianId: number) {
    const accounts = await this.prisma.rewardAccount.findMany({
      where: { technicianId },
      include: {
        clientUser: {
          select: { id: true, nickname: true, avatarUrl: true },
        },
        ledger: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const ledger = accounts.flatMap((account) => account.ledger);
    return {
      totals: this.summarize(ledger),
      issuedCost: ledger
        .filter((entry) => entry.entryType === 'referral_reward')
        .reduce((sum, entry) => sum + entry.amount, 0),
      accounts: accounts.map((account) => ({
        id: account.id,
        client: account.clientUser,
        totals: this.summarize(account.ledger),
        ledger: account.ledger,
      })),
    };
  }

  private summarize(
    ledger: Array<{ amount: number; status: string }>,
  ) {
    const sum = (status: string) =>
      ledger
        .filter((entry) => entry.status === status)
        .reduce((total, entry) => total + entry.amount, 0);
    return {
      available: this.availableBalance(ledger),
      pending: sum('pending'),
      used: Math.abs(sum('used')),
      expired: Math.abs(sum('expired')),
      reversed: Math.abs(sum('reversed')),
    };
  }

  private availableBalance(
    ledger: Array<{ amount: number; status: string }>,
  ) {
    return ledger
      .filter((entry) => ['available', 'used'].includes(entry.status))
      .reduce((total, entry) => total + entry.amount, 0);
  }
}
