import { RewardFundService } from './reward-fund.service';

describe('RewardFundService', () => {
  const prisma: any = {
    rewardAccount: { findMany: jest.fn() },
  };
  const tx: any = {
    rewardAccount: { upsert: jest.fn(), findUnique: jest.fn() },
    rewardLedger: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  let service: RewardFundService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RewardFundService(prisma);
  });

  it('按推荐资格唯一业务来源幂等发放基金', async () => {
    tx.rewardAccount.upsert.mockResolvedValue({ id: 4 });
    tx.rewardLedger.upsert.mockResolvedValue({ id: 8, amount: 30 });

    await service.issueReferralReward(tx, {
      qualificationId: 6,
      technicianId: 2,
      referrerClientId: 7,
      rewardAmount: 30,
    });

    expect(tx.rewardAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          technicianId_clientUserId: {
            technicianId: 2,
            clientUserId: 7,
          },
        },
      }),
    );
    expect(tx.rewardLedger.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceType_sourceId_entryType: {
            sourceType: 'referral_qualification',
            sourceId: '6',
            entryType: 'referral_reward',
          },
        },
        create: expect.objectContaining({
          accountId: 4,
          amount: 30,
          status: 'available',
        }),
        update: {},
      }),
    );
  });

  it('客户余额只查询自己的账户并由账本汇总', async () => {
    prisma.rewardAccount.findMany.mockResolvedValue([
      {
        id: 4,
        technician: { id: 2, name: 'Tech' },
        ledger: [
          { amount: 30, status: 'available' },
          { amount: 10, status: 'pending' },
          { amount: -5, status: 'used' },
        ],
      },
    ]);

    const result = await service.getForClient(7);

    expect(prisma.rewardAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientUserId: 7 } }),
    );
    expect(result.totals).toEqual({
      available: 25,
      pending: 10,
      used: 5,
      expired: 0,
      reversed: 0,
    });
  });

  it('抵扣同时校验所属美甲师余额和订单报价', async () => {
    tx.rewardLedger.findUnique.mockResolvedValue(null);
    tx.rewardAccount.findUnique.mockResolvedValue({
      id: 4,
      ledger: [
        { amount: 30, status: 'available' },
        { amount: -5, status: 'used' },
      ],
    });
    tx.rewardLedger.create.mockResolvedValue({ id: 10, amount: -20 });

    await service.redeemForOrder(tx, {
      orderId: 9,
      technicianId: 2,
      clientUserId: 7,
      quotePrice: 100,
      amount: 20,
    });

    expect(tx.rewardAccount.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          technicianId_clientUserId: {
            technicianId: 2,
            clientUserId: 7,
          },
        },
      }),
    );
    expect(tx.rewardLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: -20,
        status: 'used',
        sourceId: '9',
      }),
    });
  });

  it('重复抵扣返回同一账目，不重复扣减', async () => {
    tx.rewardLedger.findUnique.mockResolvedValue({ id: 10, amount: -20 });

    await expect(
      service.redeemForOrder(tx, {
        orderId: 9,
        technicianId: 2,
        clientUserId: 7,
        quotePrice: 100,
        amount: 20,
      }),
    ).resolves.toEqual({ id: 10, amount: -20 });
    expect(tx.rewardLedger.create).not.toHaveBeenCalled();
  });

  it('取消订单创建反向账目且不修改原抵扣', async () => {
    tx.rewardLedger.findUnique.mockResolvedValue({
      id: 10,
      accountId: 4,
      amount: -20,
    });
    tx.rewardLedger.upsert.mockResolvedValue({ id: 11, amount: 20 });

    await service.reverseOrderRedemption(tx, 9);

    expect(tx.rewardLedger.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          amount: 20,
          reversalOfId: 10,
          entryType: 'fund_redemption_reversal',
        }),
        update: {},
      }),
    );
  });

  it('美甲师基金成本只汇总自己的奖励账目', async () => {
    prisma.rewardAccount.findMany.mockResolvedValue([
      {
        id: 4,
        clientUser: { id: 7, nickname: 'Alice' },
        ledger: [
          {
            entryType: 'referral_reward',
            amount: 30,
            status: 'available',
          },
        ],
      },
    ]);

    const result = await service.getForTechnician(2);

    expect(prisma.rewardAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { technicianId: 2 } }),
    );
    expect(result.issuedCost).toBe(30);
    expect(result.totals.available).toBe(30);
  });
});
